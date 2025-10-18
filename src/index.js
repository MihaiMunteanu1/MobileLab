const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyparser = require('koa-bodyparser');

app.use(bodyparser());
app.use(cors());
app.use(async(ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

app.use(async(ctx, next) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await next();
});

app.use(async(ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.response.body = { issue: [{ error: err.message || 'Unexpected error' }] };
        ctx.response.status = 500;
    }
});

class Company {
    constructor({ id, name, description,date }) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.date = date;
    }
}

const companies = [];
for (let i = 0; i < 3; i++) {
    companies.push(new Company({ id: `${i}`, name:`Compania:${i}`, description: `Descr.${i}`,date: new Date(Date.now() + i) }));
}

let lastUpdated = companies[companies.length - 1].date;
let lastId = companies[companies.length - 1].id;
const pageSize = 10;

const broadcast = data =>
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

const router = new Router();

router.get('/item', ctx => {
    ctx.response.body = companies;
    ctx.response.status = 200;
});

router.get('/item/:id', async(ctx) => {
    const itemId = ctx.request.params.id;
    const item = companies.find(item => itemId === item.id);
    if (item) {
        ctx.response.body = item;
        ctx.response.status = 200; // ok
    } else {
        ctx.response.body = { message: `item with id ${itemId} not found` };
        ctx.response.status = 404; // NOT FOUND (if you know the resource was deleted, then return 410 GONE)
    }
});

const createItem = async(ctx) => {
    const item = ctx.request.body;
    if (!item.name) { // validation
        ctx.response.body = { message: 'Name is missing' };
        ctx.response.status = 400; //  BAD REQUEST
        console.log('Name is missing')
        return;
    }

    if (!item.description) { // validation
        ctx.response.body = { message: 'description is missing' };
        ctx.response.status = 400; //  BAD REQUEST
        console.log('description is missing')
        return;
    }
    item.id = `${parseInt(lastId) + 1}`;
    lastId = item.id;
    item.date = new Date();
    companies.push(item);
    ctx.response.body = item;
    ctx.response.status = 201; // CREATED
    broadcast({ event: 'created', payload: { item } });
};

router.post('/item', async(ctx) => {
    await createItem(ctx);
});

router.put('/item/:id', async(ctx) => {
    const id = ctx.params.id;
    const item = ctx.request.body;
    const itemId = item.id;
    if (itemId && id !== item.id) {
        ctx.response.body = { message: `Param id and body id should be the same` };
        ctx.response.status = 400; // BAD REQUEST
        return;
    }
    if (!itemId) {
        await createItem(ctx);
        return;
    }
    const index = companies.findIndex(item => item.id === id);
    if (index === -1) {
        ctx.response.body = { issue: [{ error: `item with id ${id} not found` }] };
        ctx.response.status = 400; // BAD REQUEST
        return;
    }

    companies[index] = item;
    lastUpdated = new Date();
    ctx.response.body = item;
    ctx.response.status = 200; // OK
    broadcast({ event: 'updated', payload: { item } });
});

router.del('/item/:id', ctx => {
    const id = ctx.params.id;
    const index = companies.findIndex(item => id === item.id);
    if (index !== -1) {
        const item = companies[index];
        companies.splice(index, 1);
        lastUpdated = new Date();
        broadcast({ event: 'deleted', payload: { item } });
    }
    ctx.response.status = 204; // no content
});


app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3000);