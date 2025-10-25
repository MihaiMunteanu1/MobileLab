import React, { memo, version } from 'react';
import { IonItem, IonLabel, IonNote } from '@ionic/react';
import { getLogger } from '../core';
import { ItemProps } from './ItemProps';

const log = getLogger('Item');

interface ItemPropsExt extends ItemProps {
  onEdit: (id?: string) => void;
}

const formatDate = (d?: Date | string | null) => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(d);
    return isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString();
};


const formatBool = (b?: boolean | null) => {
    if (b === undefined || b === null) return '';
    return b ? 'Yes' : 'No';
};

const Item: React.FC<ItemPropsExt> = ({ _id, name,description,noEmployees,openingDate,isPublic, onEdit }) => {
  return (
    <IonItem onClick={() => onEdit(_id)}>
        <IonLabel>{name}</IonLabel>
        <IonLabel>{description}</IonLabel>
        <IonLabel>{noEmployees}</IonLabel>
        <IonLabel>{formatDate(openingDate)}</IonLabel>
        <IonLabel>{formatBool(isPublic)}</IonLabel>

    </IonItem>
  );
};

export default memo(Item);
