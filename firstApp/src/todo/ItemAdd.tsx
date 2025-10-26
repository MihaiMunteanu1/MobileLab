import React, { useCallback, useContext, useState } from 'react';
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
  IonToolbar,
} from '@ionic/react';
import { RouteComponentProps } from 'react-router';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { ItemProps } from './ItemProps';

const log = getLogger('ItemAdd');

interface ItemAddProps extends RouteComponentProps<{ id?: string }> {}

export const ItemAdd: React.FC<ItemAddProps> = ({ history }) => {
  const { saving, savingError, addItem } = useContext(ItemContext);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [noEmployees, setNoEmployees] = useState(0);
  const [openingDate, setOpeningDate] = useState<Date>(new Date(Date.now()));
  const [isPublic, setIsPublic] = useState(false);

  const handleAdd = useCallback(() => {
    const newItem: ItemProps = {
      name,
      description,
      noEmployees,
      openingDate,
      isPublic,
    } as ItemProps;

    log('add', newItem);
    addItem && addItem(newItem).then(() => history.goBack());
  }, [name, description, noEmployees, openingDate, isPublic, addItem, history]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Add</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleAdd}>Add</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <br />
        <IonLabel>
          <b>Name</b>
        </IonLabel>
        <IonInput value={name} onIonChange={(e) => setName(e.detail.value || '')} />

        <br />
        <IonLabel>
          <b>Description</b>
        </IonLabel>
        <IonInput value={description} onIonChange={(e) => setDescription(e.detail.value || '')} />

        <br />
        <IonLabel>
          <b>Number of Employees</b>
        </IonLabel>
        <IonInput
          type="number"
          value={noEmployees}
          onIonChange={(e) => setNoEmployees(parseInt(e.detail.value || '0', 10) || 0)}
        />

        <br />
        <IonLabel>
          <b>Opening Date</b>
        </IonLabel>
        <IonDatetime
          presentation="date"
          value={new Date(openingDate).toISOString()}
          onIonChange={(e) =>
            setOpeningDate(new Date(Date.parse(e.detail.value?.toString() || new Date().toString())))
          }
        />

        <br />
        <IonLabel>
          <b>Is Public</b>
        </IonLabel>
        <IonCheckbox checked={isPublic} onIonChange={(e) => setIsPublic(e.detail.checked)} />

        <br />
        <IonLoading isOpen={saving} />
        {savingError && <div>{savingError.message || 'Failed to save item'}</div>}
      </IonContent>
    </IonPage>
  );
};

export default ItemAdd;
