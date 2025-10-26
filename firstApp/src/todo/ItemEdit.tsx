import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonDatetime,
    IonHeader,
    IonInput,
    IonLabel,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar
} from '@ionic/react';
import { RouteComponentProps } from 'react-router';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { ItemProps } from './ItemProps';

const log = getLogger('ItemEdit');

interface ItemEditProps extends RouteComponentProps<{ id?: string }> {}

const ItemEdit: React.FC<ItemEditProps> = ({ history, match }) => {
    const { items, saving, savingError, updateItem } = useContext(ItemContext);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [noEmployees, setNoEmployees] = useState(0);
    const [openingDate, setOpeningDate] = useState<Date>(new Date(Date.now()));
    const [isPublic, setIsPublic] = useState(false);
    const [itemToUpdate, setItemToUpdate] = useState<ItemProps>();

    useEffect(() => {
        const routeId = match.params.id || '';
        log('ItemEdit useEffect', routeId);
        const found = items?.find(it => it._id === routeId);
        setItemToUpdate(found);
        if (found) {
            setName(found.name);
            setDescription(found.description);
            setOpeningDate(found.openingDate);
            setNoEmployees(found.noEmployees || 0);
            setIsPublic(found.isPublic || false);
        }
    }, [match.params.id, items]);

    const handleUpdate = useCallback(() => {
        // const editedItem: ItemProps = {
        //     ...itemToUpdate,
        //     name,
        //     description,
        //     noEmployees,
        //     openingDate,
        //     isPublic
        // } as ItemProps;
        const editedItem = {
            ...itemToUpdate,
            name,
            description,
            noEmployees,
            openingDate,
            isPublic
        };
        log('update', editedItem);
        updateItem && updateItem(editedItem).then(() => history.goBack());
    }, [itemToUpdate, name, description, noEmployees, openingDate, isPublic, updateItem, history]);

    log('render ItemEdit');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton />
                    </IonButtons>
                    <IonTitle>Edit</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={handleUpdate}>Update</IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                <br />
                <IonLabel><b>Name</b></IonLabel>
                <IonInput value={name} onIonChange={e => setName(e.detail.value || '')} />

                <br />
                <IonLabel><b>Description</b></IonLabel>
                <IonInput value={description} onIonChange={e => setDescription(e.detail.value || '')} />

                <br />
                <IonLabel><b>Number of Employees</b></IonLabel>
                <IonInput
                    type="number"
                    value={noEmployees}
                    onIonChange={e => setNoEmployees(parseInt(e.detail.value || '0', 10) || 0)}
                />

                <br />
                <IonLabel><b>Opening Date</b></IonLabel>
                <IonDatetime
                    presentation="date"
                    value={new Date(openingDate).toISOString()}
                    onIonChange={e =>
                        setOpeningDate(new Date(Date.parse(e.detail.value?.toString() || new Date().toString())))
                    }
                />

                <br />
                <IonLabel><b>Is Public</b></IonLabel>
                <IonCheckbox checked={isPublic} onIonChange={e => setIsPublic(e.detail.checked)} />

                <IonLoading isOpen={saving} />
                {savingError && <div>{savingError.message || 'Failed to save item'}</div>}
            </IonContent>
        </IonPage>
    );
};

export default ItemEdit;
