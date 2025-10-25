import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonLabel,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar,
    IonCheckbox, IonDatetime
} from '@ionic/react';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { RouteComponentProps } from 'react-router';
import { ItemProps } from './ItemProps';

const log = getLogger('ItemEdit');

interface ItemEditProps extends RouteComponentProps<{
  id?: string;
}> {}

const ItemEdit: React.FC<ItemEditProps> = ({ history, match }) => {
  const { items, saving,  savingError,  saveItem  } = useContext(ItemContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [noEmployees, setNoEmployees] = useState(0);
  const [openingDate, setOpeningDate] = useState<Date>(new Date(Date.now()));
  const [isPublic, setIsPublic] = useState(false);
  const [item, setItem] = useState<ItemProps>();

    useEffect(() => {
        log('useEffect');
        const routeId = match.params.id || '';
        const item = items?.find(it => it._id === routeId);
        setItem(item);
        if (item) {
            console.log(item);
            setName(item.name);
            setDescription(item.description);
            setOpeningDate(item.openingDate);
            setNoEmployees(item.noEmployees || 0);
            setIsPublic(item.isPublic || false);
        }
    }, [match.params.id, items]);

    const handleSave = useCallback(() => {
        const editedItem = {
            ...item,
            name,
            description,
            noEmployees,
            openingDate,
            isPublic
        };
        saveItem && saveItem(editedItem).then(() => history.goBack());
    }, [item, saveItem, name,description,noEmployees,openingDate,isPublic, history]);




    // useEffect(() => {
  //   log('useEffect');
  //   const routeId = match.params.id || '';
  //   const item = items?.find(it => it._id === routeId);
  //   setItem(item);
  //   if (item) {
  //       console.log(item);
  //       setName(item.name);
  //       setDescription(item.description);
  //       if (item.openingDate) {
  //           const d = item.openingDate instanceof Date ? item.openingDate : new Date(item.openingDate);
  //           setOpeningDate(isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10));
  //       } else {
  //           setOpeningDate('');
  //       }
  //       setNoEmployees(item.noEmployees || 0);
  //       setIsPublic(item.isPublic || false);
  //   }
  // }, [match.params.id, items]);
  //
  // const handleSave = useCallback(() => {
  //     const editedItem: ItemProps = {
  //         ...item,
  //         name,
  //         description,
  //         noEmployees: Number(noEmployees) || 0,
  //         openingDate: openingDate ? new Date(openingDate) : undefined,
  //         isPublic
  //     } as ItemProps;
  //     saveItem && saveItem(editedItem).then(() => history.goBack());
  // }, [item, saveItem, name,description,noEmployees,openingDate,isPublic, history]);
  //

  log('render');
  console.log(item);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Edit</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave}> Save </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>        
        <br/>
        <IonLabel><b>Name</b></IonLabel>
        <IonInput value={name} onIonChange={e => setName(e.detail.value || '')} />
        <br/>
        <IonLabel><b>Description</b></IonLabel>
        <IonInput value={description} onIonChange={e => setDescription(e.detail.value || '')} />
        <br/>
        <IonLabel><b>Number of Employees</b></IonLabel>
        <IonInput type="number" value={noEmployees} onIonChange={e => setNoEmployees(parseInt(e.detail.value!, 10) || 0)} />
        <br/>
          <IonLabel><b>Opening Date</b></IonLabel>
          <IonDatetime presentation="date" value={new Date(openingDate).toISOString()} onIonChange={e=>{ setOpeningDate(new Date(Date.parse(e.detail.value?.toString() || new Date(Date.now()).toString())))}}/>
          <br/>
        <IonLabel><b>Is Public</b></IonLabel>
        <IonCheckbox checked={isPublic} onIonChange={e => setIsPublic(e.detail.checked)} />
        <br/>

        <IonLoading isOpen={saving} />
        {savingError && (
          <div>{savingError.message || 'Failed to save item'}</div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default ItemEdit;
