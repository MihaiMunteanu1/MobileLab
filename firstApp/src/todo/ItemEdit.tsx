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
  IonToolbar
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
    }
  }, [match.params.id, items]);

  const handleSave = useCallback(() => {    
    const editedItem = { ...item, name, description };
    saveItem && saveItem(editedItem).then(() => history.goBack());
  }, [item, saveItem, name,description, history]);


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

        <IonLoading isOpen={saving} />
        {savingError && (
          <div>{savingError.message || 'Failed to save item'}</div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default ItemEdit;
