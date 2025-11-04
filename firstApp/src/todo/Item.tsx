import React, { memo, version } from 'react';
import { IonItem, IonLabel, IonNote, IonImg } from '@ionic/react';
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

const Item: React.FC<ItemPropsExt> = ({ _id, name,description,noEmployees,openingDate,isPublic,webViewPath, onEdit }) => {
  return (
      <IonItem onClick={() => onEdit(_id)} style={{marginRight: '100px', paddingRight: '15px'}}>
          <IonLabel style={{whiteSpace: 'normal', overflow: 'visible', marginRight: '120px'}}>{name}</IonLabel>
          <IonLabel style={{whiteSpace: 'normal', overflow: 'visible', marginRight: '120px'}}>{description}</IonLabel>
          <IonLabel style={{whiteSpace: 'normal', overflow: 'visible', marginRight: '120px'}}>{noEmployees}</IonLabel>
          <IonLabel style={{whiteSpace: 'normal', overflow: 'visible', marginRight: '120px'}}>{formatDate(openingDate)}</IonLabel>
          <IonLabel style={{whiteSpace: 'normal', overflow: 'visible', marginRight: '120px'}}>{formatBool(isPublic)}</IonLabel>
          {webViewPath && <IonImg src={webViewPath} alt={name} style={{width: '250px', height: '250px'}} />}
      </IonItem>
    // <IonItem onClick={() => onEdit(_id)} >
    //     <IonLabel style={{marginRight: '100px'}}>{name}</IonLabel>
    //     <IonLabel style={{marginRight: '100px'}}>{description}</IonLabel>
    //     <IonLabel style={{marginRight: '100px'}}>{noEmployees}</IonLabel>
    //     <IonLabel style={{marginRight: '100px'}}>{formatDate(openingDate)}</IonLabel>
    //     <IonLabel style={{marginRight: '100px'}}>{formatBool(isPublic)}</IonLabel>
    //     {webViewPath && <IonImg src={webViewPath} alt={name} style={{width: '250px', height: '250px'}} />}
    // </IonItem>
  );
};

export default memo(Item);
