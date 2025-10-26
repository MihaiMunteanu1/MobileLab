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

type UpdateItemFn = (item: ItemProps) => Promise<any>;
type AddItemFn = (item: ItemProps) => Promise<any>;

interface ItemsState {
    items?: ItemProps[];
    fetching: boolean;
    fetchingError?: Error | null;
    saving: boolean;
    savingError?: Error | null;
    updateItem?: UpdateItemFn;
    addItem?: AddItemFn;
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

const UPDATE_ITEM_STARTED = 'UPDATE_ITEM_STARTED';
const UPDATE_ITEM_SUCCEEDED = 'UPDATE_ITEM_SUCCEEDED';
const UPDATE_ITEM_FAILED = 'UPDATE_ITEM_FAILED';

const CREATE_ITEM_STARTED = 'CREATE_ITEM_STARTED';
const CREATE_ITEM_SUCCEEDED = 'CREATE_ITEM_SUCCEEDED';
const CREATE_ITEM_FAILED = 'CREATE_ITEM_FAILED';


const REPLACE_TEMP_ITEM = 'REPLACE_TEMP_ITEM';


const reducer: (state: ItemsState, action: ActionProps) => ItemsState = (state, { type, payload }) => {
    switch (type) {
        case FETCH_ITEMS_STARTED:
            return { ...state, fetching: true, fetchingError: null };
        case FETCH_ITEMS_SUCCEEDED:
            return { ...state, items: payload.items, fetching: false };
        case FETCH_ITEMS_FAILED:
            return { ...state, fetchingError: payload.error, fetching: false };

        case UPDATE_ITEM_STARTED:
            return { ...state, savingError: null, saving: true };
        case UPDATE_ITEM_FAILED:
            return { ...state, savingError: payload.error, saving: false };
        case UPDATE_ITEM_SUCCEEDED: {
            const items = [...(state.items || [])];
            const item = payload.item as ItemProps;
            const index = items.findIndex((it) => it._id === item._id);
            if (index === -1) items.splice(0, 0, item);
            else items[index] = item;
            return { ...state, items, saving: false };
        }

        case CREATE_ITEM_STARTED:
            return { ...state, savingError: null, saving: true };
        case CREATE_ITEM_FAILED:
            return { ...state, savingError: payload.error, saving: false };
        case CREATE_ITEM_SUCCEEDED: {
            const items = [...(state.items || [])];
            const item = payload.item as ItemProps;
            const index = items.findIndex((it) => it._id === item._id);
            if (index === -1) items.splice(0, 0, item);
            else items[index] = item;
            return { ...state, items, saving: false, savingError: null };
        }

        case REPLACE_TEMP_ITEM: {
            const { tempId, item } = payload as { tempId: string; item: ItemProps };
            const items = [...(state.items || [])];
            const tmpIdx = items.findIndex((it) => it._id === tempId);
            if (tmpIdx >= 0) {
                items[tmpIdx] = item; // replace temp with server item
            } else {
                const idx = items.findIndex((it) => it._id === item._id);
                if (idx === -1) items.splice(0, 0, item);
                else items[idx] = item;
            }
            return { ...state, items, saving: false, savingError: null };
        }

        default:
            return state;
    }
};

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
    children: PropTypes.ReactNodeLike;
}

// tag offline items locally
type LocalItem = ItemProps & { isNotSaved?: boolean };

export const ItemProvider: React.FC<ItemProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { items, fetching, fetchingError, saving, savingError } = state;

    const { token } = useContext(AuthContext);
    const { networkStatus } = useNetwork();
    const [toast] = useIonToast();

    useEffect(getItemsEffect, [token]);
    useEffect(wsEffect, [token]);
    useEffect(executePendingOperations, [networkStatus.connected, token]);

    const updateItem = useCallback<UpdateItemFn>(updateItemCallback, [token]);
    const addItem = useCallback<AddItemFn>(addItemCallback, [token]);

    function getItemsEffect() {
        let canceled = false;
        fetchAll();
        return () => {
            canceled = true;
        };

        async function fetchAll() {
            if (!token?.trim()) return;
            try {
                log('fetchItems started');
                dispatch({ type: FETCH_ITEMS_STARTED });
                const data = await getItems(token);
                log('fetchItems succeeded');
                if (!canceled) {
                    dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items: data } });
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
        dispatch({ type: UPDATE_ITEM_STARTED });
        try {
            log('updateItem started');
            const updated = await updateItemAPI(token, item);
            log('updateItem succeeded');
            dispatch({ type: UPDATE_ITEM_SUCCEEDED, payload: { item: updated } });
        } catch (error: any) {
            log('updateItem failed (offline queue)');
            const local: LocalItem = { ...(item as LocalItem), isNotSaved: true };
            const key = `upd-${(item as any)._id ?? item?.name ?? Date.now().toString()}`;
            await Preferences.set({ key, value: JSON.stringify({ token, item: local }) });
            dispatch({ type: UPDATE_ITEM_SUCCEEDED, payload: { item: local } });
            toast('You are offline... Updating item locally!', 3000);
            if (error?.toJSON?.().message === 'Network Error') {
                dispatch({ type: UPDATE_ITEM_FAILED, payload: { error: new Error('Network error') } });
            }
        }
    }

    async function addItemCallback(item: ItemProps) {
        dispatch({ type: CREATE_ITEM_STARTED });
        try {
            log('addItem started');
            const created = await createItemAPI(token, item);
            log('addItem succeeded');
            dispatch({ type: CREATE_ITEM_SUCCEEDED, payload: { item: created } });
        } catch (error: any) {
            log('addItem failed (offline queue)');
            const { keys } = await Preferences.keys();
            const pendingCreates = keys.filter((k) => k.startsWith('sav-')).length + 1;
            const tempId = `tmp-${pendingCreates}`;
            const local: LocalItem = { ...(item as LocalItem), _id: tempId as any, isNotSaved: true };
            await Preferences.set({ key: `sav-${tempId}`, value: JSON.stringify({ token, item: local }) });
            dispatch({ type: CREATE_ITEM_SUCCEEDED, payload: { item: local } });
            toast('You are offline... Saving item locally!', 3000);
            if (error?.toJSON?.().message === 'Network Error') {
                dispatch({ type: CREATE_ITEM_FAILED, payload: { error: new Error('Network error') } });
            }
        }
    }
    function executePendingOperations() {
        async function run() {
            if (!networkStatus.connected || !token?.trim()) return;

            log('executing pending operations');
            const { keys } = await Preferences.keys();

            // replay pending creates and map tempId -> realId
            for (const key of keys) {
                if (!key.startsWith('sav-')) continue;
                const res = await Preferences.get({ key });
                if (typeof res.value !== 'string') continue;

                const tempId = key.substring(4); // sav-<tmp-id>
                const value = JSON.parse(res.value) as { token: string; item: LocalItem };
                const replay: any = { ...value.item };
                delete replay._id;
                delete replay.isNotSaved;

                try {
                    const created = await createItemAPI(token, replay);
                    // replace temp in state and store map for later updates
                    dispatch({ type: REPLACE_TEMP_ITEM, payload: { tempId, item: created } });
                    await Preferences.set({ key: `map-${tempId}`, value: String((created as any)._id) });
                    await Preferences.remove({ key });
                } catch (e) {
                    log('replay create failed', e);
                }
            }

            // replay pending updates (translate tmp ids using the map)
            for (const key of keys) {
                if (!key.startsWith('upd-')) continue;
                const res = await Preferences.get({ key });
                if (typeof res.value !== 'string') continue;

                const value = JSON.parse(res.value) as { token: string; item: LocalItem };
                const toSend: any = { ...value.item };
                delete toSend.isNotSaved;

                if (typeof toSend._id === 'string' && toSend._id.startsWith('tmp-')) {
                    const mapped = await Preferences.get({ key: `map-${toSend._id}` });
                    if (!mapped.value) {
                        // the create hasn't succeeded yet; skip for now
                        continue;
                    }
                    toSend._id = mapped.value;
                }

                try {
                    const updated = await updateItemAPI(token, toSend);
                    dispatch({ type: UPDATE_ITEM_SUCCEEDED, payload: { item: updated } });
                    await Preferences.remove({ key });
                } catch (e) {
                    log('replay update failed', e);
                }
            }
        }
        run();
    }
    // function executePendingOperations() {
    //     async function run() {
    //         if (!networkStatus.connected || !token?.trim()) return;
    //
    //         log('executing pending operations');
    //         const { keys } = await Preferences.keys();
    //
    //         // replay pending creates
    //         for (const key of keys) {
    //             if (key.startsWith('sav-')) {
    //                 const res = await Preferences.get({ key });
    //                 if (typeof res.value === 'string') {
    //                     const value = JSON.parse(res.value) as { token: string; item: LocalItem };
    //                     const replay = { ...value.item };
    //                     (replay as any)._id = undefined; // let server assign id
    //                     await addItemCallback(replay);
    //                     await Preferences.remove({ key });
    //                 }
    //             }
    //         }
    //
    //         // replay pending updates
    //         for (const key of keys) {
    //             if (key.startsWith('upd-')) {
    //                 const res = await Preferences.get({ key });
    //                 if (typeof res.value === 'string') {
    //                     const value = JSON.parse(res.value) as { token: string; item: LocalItem };
    //                     await updateItemCallback(value.item);
    //                     await Preferences.remove({ key });
    //                 }
    //             }
    //         }
    //     }
    //     run();
    // }

    function wsEffect() {
        let canceled = false;
        log('wsEffect - connecting');
        let closeWebSocket: () => void;
        if (token?.trim()) {
            closeWebSocket = newWebSocket(token, (message) => {
                if (canceled) return;
                const { type, payload: item } = message;
                log(`ws message, item ${type}`);
                if (type === 'created') {
                    dispatch({ type: CREATE_ITEM_SUCCEEDED, payload: { item } });
                }
                if (type === 'updated') {
                    dispatch({ type: UPDATE_ITEM_SUCCEEDED, payload: { item } });
                }
            });
        }
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket?.();
        };
    }


    const value = {
        items,
        fetching,
        fetchingError,
        saving,
        savingError,
        updateItem,
        addItem,
    };

    return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>;
};

