// firstApp/src/todo/ItemProvider.tsx
import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { ItemProps } from './ItemProps';
import {
    createItem as createItemAPI,
    getItems,
    newWebSocket,
    updateItem as updateItemAPI,
} from './itemApi';
import { AuthContext } from '../auth';
import { useNetwork } from '../pages/useNetwork';
import { useIonToast } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';

const log = getLogger('ItemProvider');

type AddItemFn = (item: ItemProps) => Promise<any>;
type UpdateItemFn = (item: ItemProps) => Promise<any>;

export interface ItemsState {
    items?: ItemProps[];
    fetching: boolean;
    fetchingError?: Error | null;
    saving: boolean;
    savingError?: Error | null;
    addItem?: AddItemFn;
    updateItem?: UpdateItemFn;
}

interface ActionProps {
    type: string;
    payload?: any;
}

const initialState: ItemsState = {
    fetching: false,
    saving: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';

const reducer: (state: ItemsState, action: ActionProps) => ItemsState = (state, { type, payload }) => {
    switch (type) {
        case FETCH_ITEMS_STARTED:
            return { ...state, fetching: true, fetchingError: null };
        case FETCH_ITEMS_SUCCEEDED:
            return { ...state, items: payload.items, fetching: false };
        case FETCH_ITEMS_FAILED:
            return { ...state, fetchingError: payload.error, fetching: false };
        case SAVE_ITEM_STARTED:
            return { ...state, savingError: null, saving: true };
        case SAVE_ITEM_SUCCEEDED: {
            const items = [...(state.items || [])];
            const item = payload.item as ItemProps;
            const index = items.findIndex((it) => it._id === item._id);
            if (index === -1) {
                items.splice(0, 0, item);
            } else {
                items[index] = item;
            }
            return { ...state, items, saving: false };
        }
        case SAVE_ITEM_FAILED:
            return { ...state, savingError: payload.error, saving: false };
        default:
            return state;
    }
};

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
    children: PropTypes.ReactNodeLike;
}

// local helper type to tag offline items without changing ItemProps
type LocalItem = ItemProps & { isNotSaved?: boolean };

export const ItemProvider: React.FC<ItemProviderProps> = ({ children }) => {
    const { token } = useContext(AuthContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    const { items, fetching, fetchingError, saving, savingError } = state;
    const { networkStatus } = useNetwork();
    const [toast] = useIonToast();

    useEffect(getItemsEffect, [token]);
    useEffect(wsEffect, [token]);
    useEffect(executePendingOperations, [networkStatus.connected, token]);

    const addItem = useCallback<AddItemFn>(addItemCallback, [token]);
    const updateItem = useCallback<UpdateItemFn>(updateItemCallback, [token]);

    log('returns');
    const value = { items, fetching, fetchingError, saving, savingError, addItem, updateItem };

    return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>;

    function getItemsEffect() {
        let canceled = false;
        fetchItems();
        return () => {
            canceled = true;
        };

        async function fetchItems() {
            if (!token?.trim()) return;
            try {
                log('fetchItems started');
                dispatch({ type: FETCH_ITEMS_STARTED });
                const items = await getItems(token);
                log('fetchItems succeeded');
                if (!canceled) {
                    dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
                }
            } catch (error) {
                log('fetchItems failed', error);
                if (!canceled) {
                    dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
                }
            }
        }
    }

    async function updateItemCallback(item: ItemProps) {
        dispatch({ type: SAVE_ITEM_STARTED });
        try {
            log('updateItem started');
            const updated = await updateItemAPI(token, item);
            log('updateItem succeeded');
            dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: updated } });
        } catch (error: any) {
            log('updateItem failed (offline queue)');
            const localItem: LocalItem = { ...(item as LocalItem), isNotSaved: true };
            const key = `upd-${(item as any)._id ?? Date.now().toString()}`;
            await Preferences.set({ key, value: JSON.stringify({ token, item: localItem }) });
            dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: localItem } });
            toast('You are offline... Updating item locally!', 3000);
            if (error?.toJSON?.().message === 'Network Error') {
                dispatch({ type: SAVE_ITEM_FAILED, payload: { error: new Error('Network error') } });
            }
        }
    }

    async function addItemCallback(item: ItemProps) {
        dispatch({ type: SAVE_ITEM_STARTED });
        try {
            log('addItem started');
            const created = await createItemAPI(token, item);
            log('addItem succeeded');
            dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: created } });
        } catch (error: any) {
            log('addItem failed (offline queue)');
            const { keys } = await Preferences.keys();
            const pendingCreates = keys.filter((k) => k.startsWith('sav-')).length + 1;
            const tempId = `tmp-${pendingCreates}`;
            const localItem: LocalItem = { ...(item as LocalItem), _id: tempId as any, isNotSaved: true };
            await Preferences.set({ key: `sav-${tempId}`, value: JSON.stringify({ token, item: localItem }) });
            dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: localItem } });
            toast('You are offline... Saving item locally!', 3000);
            if (error?.toJSON?.().message === 'Network Error') {
                dispatch({ type: SAVE_ITEM_FAILED, payload: { error: new Error('Network error') } });
            }
        }
    }

    function executePendingOperations() {
        async function run() {
            if (!networkStatus.connected || !token?.trim()) return;

            log('executing pending operations');
            const { keys } = await Preferences.keys();

            // replay pending creates
            for (const key of keys) {
                if (key.startsWith('sav-')) {
                    const res = await Preferences.get({ key });
                    if (typeof res.value === 'string') {
                        const value = JSON.parse(res.value) as { token: string; item: LocalItem };
                        const replayItem = { ...value.item };
                        // let server assign a real id
                        (replayItem as any)._id = undefined;
                        log('creating item from pending', replayItem);
                        await addItemCallback(replayItem);
                        await Preferences.remove({ key });
                    }
                }
            }

            // replay pending updates
            for (const key of keys) {
                if (key.startsWith('upd-')) {
                    const res = await Preferences.get({ key });
                    if (typeof res.value === 'string') {
                        const value = JSON.parse(res.value) as { token: string; item: LocalItem };
                        const replayItem = { ...value.item };
                        log('updating item from pending', replayItem);
                        await updateItemCallback(replayItem);
                        await Preferences.remove({ key });
                    }
                }
            }
        }
        run();
    }

    function wsEffect() {
        let canceled = false;
        log('wsEffect - connecting');
        let closeWebSocket: () => void;
        if (token?.trim()) {
            closeWebSocket = newWebSocket(token, (message) => {
                if (canceled) return;
                const { type, payload: item } = message;
                log(`ws message, item ${type}`);
                if (type === 'created' || type === 'updated') {
                    dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } });
                }
            });
        }
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket?.();
        };
    }
}


// import React, {useCallback, useContext, useEffect, useReducer} from 'react';
// import PropTypes from 'prop-types';
// import { getLogger } from '../core';
// import { ItemProps } from './ItemProps';
// import { createItem, getItems, newWebSocket, updateItem } from './itemApi';
// import {AuthContext} from "../auth";
//
// const log = getLogger('ItemProvider');
//
// type SaveItemFn = (item: ItemProps) => Promise<any>;
//
// export interface ItemsState {
//   items?: ItemProps[],
//   fetching: boolean,
//   fetchingError?: Error | null,
//   saving: boolean,
//   savingError?: Error | null,
//   saveItem?: SaveItemFn,
// }
//
// interface ActionProps {
//   type: string,
//   payload?: any,
// }
//
// const initialState: ItemsState = {
//   fetching: false,
//   saving: false,
// };
//
// const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
// const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
// const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
// const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
// const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
// const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';
//
// const reducer: (state: ItemsState, action: ActionProps) => ItemsState =
//     (state, { type, payload }) => {
//         switch (type) {
//             case FETCH_ITEMS_STARTED:
//                 return { ...state, fetching: true, fetchingError: null };
//             case FETCH_ITEMS_SUCCEEDED:
//                 return { ...state, items: payload.items, fetching: false };
//             case FETCH_ITEMS_FAILED:
//                 return { ...state, fetchingError: payload.error, fetching: false };
//             case SAVE_ITEM_STARTED:
//                 return { ...state, savingError: null, saving: true };
//             case SAVE_ITEM_SUCCEEDED:
//                 const items = [...(state.items || [])];
//                 const item = payload.item;
//                 const index = items.findIndex(it => it._id === item._id);
//                 if (index === -1) {
//                     items.splice(0, 0, item);
//                 } else {
//                     items[index] = item;
//                 }
//                 return { ...state, items, saving: false };
//             case SAVE_ITEM_FAILED:
//                 return { ...state, savingError: payload.error, saving: false };
//             default:
//                 return state;
//         }
//     };
//
// export const ItemContext = React.createContext<ItemsState>(initialState);
//
// interface ItemProviderProps {
//     children: PropTypes.ReactNodeLike,
// }
//
// export const ItemProvider: React.FC<ItemProviderProps> = ({ children }) => {
//     const { token } = useContext(AuthContext);
//     const [state, dispatch] = useReducer(reducer, initialState);
//     const { items, fetching, fetchingError, saving, savingError } = state;
//     useEffect(getItemsEffect, [token]);
//     useEffect(wsEffect, [token]);
//     const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token]);
//     const value = { items, fetching, fetchingError, saving, savingError, saveItem };
//     log('returns');
//     return (
//         <ItemContext.Provider value={value}>
//             {children}
//         </ItemContext.Provider>
//     );
//
//   function getItemsEffect() {
//     let canceled = false;
//     fetchItems();
//     return () => {
//       canceled = true;
//     }
//
//       async function fetchItems() {
//           try {
//               log('fetchItems started');
//               dispatch({ type: FETCH_ITEMS_STARTED });
//               const items = await getItems(token);
//               log('fetchItems succeeded');
//               if (!canceled) {
//                   dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
//               }
//           } catch (error) {
//               log('fetchItems failed', error);
//               dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
//           }
//       }
//   }
//
//     async function saveItemCallback(item: ItemProps) {
//         try {
//             log('saveItem started');
//             dispatch({ type: SAVE_ITEM_STARTED });
//             const savedItem = await (item._id ? updateItem(token, item) : createItem(token, item));
//             log('saveItem succeeded');
//             dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: savedItem } });
//         } catch (error) {
//             log('saveItem failed');
//             dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
//         }
//     }
//
//
//
//     function wsEffect() {
//         let canceled = false;
//         log('wsEffect - connecting');
//         let closeWebSocket: () => void;
//         if (token?.trim()) {
//             closeWebSocket = newWebSocket(token, message => {
//                 if (canceled) {
//                     return;
//                 }
//                 const { type, payload: item } = message;
//                 log(`ws message, item ${type}`);
//                 if (type === 'created' || type === 'updated') {
//                     dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } });
//                 }
//             });
//         }
//         return () => {
//             log('wsEffect - disconnecting');
//             canceled = true;
//             closeWebSocket?.();
//         }
//     }
// };
