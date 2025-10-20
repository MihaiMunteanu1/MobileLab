import React, { memo, version } from 'react';
import { IonItem, IonLabel, IonNote } from '@ionic/react';
import { getLogger } from '../core';
import { ItemProps } from './ItemProps';

const log = getLogger('Item');

interface ItemPropsExt extends ItemProps {
  onEdit: (id?: string) => void;
}

const Item: React.FC<ItemPropsExt> = ({ id, name,description, onEdit }) => {
  return (
    <IonItem onClick={() => onEdit(id)}>
        <IonLabel>{name}</IonLabel>
        <IonLabel>{description}</IonLabel>
    </IonItem>
  );
};

export default memo(Item);
