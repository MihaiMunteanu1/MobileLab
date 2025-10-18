import Router from "koa-router";
import dataStore from "nedb-promise";
import { broadcast } from "./wss.js";

export class ItemStore {
    constructor({ filename, autoload }) {
        this.store = dataStore({ filename, autoload });
    }

    async find(props) {
        return this.store.find(props);
    }

    async findOne(props) {
        return this.store.findOne(props);
    }

    async insert(company) {
        console.log("received");
        console.log(company);
        if (!company.name) throw new Error("Missing name!");

        /*if (!company.description) throw new Error("Missing description!");*/

        return this.store.insert(company);
    }

    async update(props, item) {
        return this.store.update(props, item);
    }

    async remove(props) {
        return this.store.remove(props);
    }
}

const itemStore = new ItemStore({
    filename: "./db/items.json",
    autoload: true,
});

export const itemRouter = new Router();

itemRouter.get("/", async (ctx) => {
    const userId = ctx.state.user._id;
    console.log("here");
    ctx.response.body = await itemStore.find({ userId });
    ctx.response.status = 200; // ok
});

itemRouter.get("/:id", async (ctx) => {
    const userId = ctx.state.user._id;
    const item = await noteStore.findOne({ _id: ctx.params.id });
    const response = ctx.response;
    if (item) {
        if (item.userId === userId) {
            ctx.response.body = item;
            ctx.response.status = 200; // ok
        } else {
            ctx.response.status = 403; // forbidden
        }
    } else {
        ctx.response.status = 404; // not found
    }
});

const createItem = async (ctx, company, response) => {
    try {
        const userId = ctx.state.user._id;
        console.log(userId);
        company.userId = userId;
        response.body = await itemStore.insert(company);
        console.log(response.body);
        response.status = 201; // created
        broadcast(userId, {
            event: "created",
            payload: { updatedCompany: response.body },
        });
    } catch (err) {
        console.log("here");
        console.log(err);
        response.body = { message: err.message };
        response.status = 400; // bad request
    }
};

itemRouter.post(
    "/",
    async (ctx) => await createItem(ctx, ctx.request.body, ctx.response)
);

itemRouter.put("/:id", async (ctx) => {
    const company = ctx.request.body;
    const id = ctx.params.id;
    const companyId = company._id;
    const response = ctx.response;
    if (companyId && companyId !== id) {
        response.body = { message: "Param id and body _id should be the same" };
        response.status = 400; // bad request
        return;
    }
    if (!companyId) {
        await createItem(ctx, company, response);
    } else {
        const userId = ctx.state.user._id;
        company.userId = userId;
        const updatedCount = await itemStore.update({ _id: id }, company);
        if (updatedCount === 1) {
            response.body = company;
            response.status = 200; // ok
            broadcast(userId, {
                event: "updated",
                payload: { successMessage: "Updated company!", updatedCompany: company },
            });
        } else {
            response.body = { message: "Resource no longer exists" };
            response.status = 405; // method not allowed
        }
    }
});

itemRouter.del("/:id", async (ctx) => {
    const userId = ctx.state.user._id;
    const item = await itemStore.findOne({ _id: ctx.params.id });
    if (item && userId !== item.userId) {
        ctx.response.status = 403; // forbidden
    } else {
        await itemStore.remove({ _id: ctx.params.id });
        ctx.response.status = 204; // no content
        broadcast(userId, { event: "deleted", payload: { updatedCompany: item } });
    }
});