import React, { useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import {
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonList,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar,
    IonSelect,
    IonSelectOption,
    IonSearchbar,
    IonInfiniteScroll,
    IonInfiniteScrollContent, IonButton, IonButtons
} from '@ionic/react';
import { add } from 'ionicons/icons';
import Item from './Item';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import Home from "../pages/Home";
import {AuthContext} from "../auth";


const log = getLogger('ItemList');
const itemsPerPage = 3;
const filterValues = ['IsPublic', 'IsPrivate'];

const ItemList: React.FC<RouteComponentProps> = ({ history }) => {
    const { items, fetching, fetchingError } = useContext(ItemContext);
    const { logout } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [index, setIndex] = useState<number>(0);
    const [itemsAux, setItemsAux] = useState<typeof items>([]);
    const [more, setHasMore] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [filter, setFilter] = useState<string | undefined>(undefined);

    useEffect(() => {
        setIsOpen(!!fetching);
    }, [fetching]);

    log('render');

    function handleLogout(){
        logout?.();
        history.push('/login');
    }

    const getFiltered = () => {
        if (!items) return [];
        let result = items;
        if (searchText && searchText.trim() !== '') {
            const q = searchText.toLowerCase();
            // search only by company name
            result = result.filter(
                it => it.name && it.name.toLowerCase().includes(q)
            );
        }
        if (filter) {
            if (filter === 'IsPublic') result = result.filter(it => it.isPublic === true);
            else result = result.filter(it => it.isPublic === false);
        }
        return result;
    };

    useEffect(() => {
        const filtered = getFiltered();
        const newIndex = Math.min(itemsPerPage, filtered.length);
        setIndex(newIndex);
        setItemsAux(filtered.slice(0, newIndex));
        setHasMore(newIndex < filtered.length);
    }, [items, searchText, filter]);

    const fetchData = () => {
        const filtered = getFiltered();
        const newIndex = Math.min(index + itemsPerPage, filtered.length);
        setItemsAux(filtered.slice(0, newIndex));
        setIndex(newIndex);
        setHasMore(newIndex < filtered.length);
    };

    const searchNext = async ($event: CustomEvent<void>) => {
        fetchData();
        await ($event.target as HTMLIonInfiniteScrollElement).complete();
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Companii</IonTitle>
                    <div slot="secondary">
                        <Home />
                    </div>
                    <IonSelect
                        slot="end"
                        style={{marginRight: '30px'}}
                        value={filter}
                        placeholder="Filter"
                        onIonChange={e => setFilter(e.detail.value)}
                    >
                        {filterValues.map(each => (
                            <IonSelectOption key={each} value={each}>
                                {each}
                            </IonSelectOption>
                        ))}
                    </IonSelect>

                    <IonButtons slot='end'>
                        <IonButton onClick={handleLogout}>Logout</IonButton>
                    </IonButtons>



                    <IonSearchbar
                        placeholder="Search by company name"
                        style={{ maxWidth: '400px' }}
                        value={searchText}
                        debounce={200}
                        onIonInput={e => setSearchText(e.detail.value!)}
                        slot="secondary"
                    />
                </IonToolbar>


            </IonHeader>

            <IonContent>
                <IonLoading isOpen={isOpen} message="Fetching items" />
                {itemsAux && (
                    <IonList>
                        {itemsAux.map(({ _id, name, description, noEmployees, openingDate, isPublic }) => (
                            <div key={_id} style={{height: '190px'}}>
                                <Item
                                    _id={_id}
                                    name={name}
                                    description={description}
                                    noEmployees={noEmployees}
                                    openingDate={openingDate}
                                    isPublic={isPublic}
                                    onEdit={id => history.push(`/item/${id}`)}
                                />
                            </div>
                        ))}
                    </IonList>
                )}

                <IonInfiniteScroll
                    threshold="100px"
                    disabled={!more}
                    onIonInfinite={(e: CustomEvent<void>) => searchNext(e)}
                >
                    <IonInfiniteScrollContent loadingText="Loading more items..." />
                </IonInfiniteScroll>

                {fetchingError && <div>{fetchingError.message || 'Failed to fetch items'}</div>}

                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton onClick={() => history.push('/item')}>
                        <IonIcon icon={add} />
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default ItemList;
