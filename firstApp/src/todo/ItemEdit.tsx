import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
    IonActionSheet,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox, IonCol,
    IonContent,
    IonDatetime, IonFab, IonFabButton, IonGrid,
    IonHeader, IonIcon, IonImg,
    IonInput,
    IonLabel,
    IonLoading,
    IonPage, IonRow,
    IonTitle,
    IonToolbar
} from '@ionic/react';
import { RouteComponentProps } from 'react-router';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { ItemProps } from './ItemProps';
import {Photo, usePhotoGallery} from "../pages/usePhotoGallery";
import {camera, trash} from "ionicons/icons";
import MyMap from "../pages/MyMap";
import { useMyLocation } from "../pages/useMyLocation";

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

    const {photos, takePhoto, deletePhoto} = usePhotoGallery();

    const [showStoredPictures, setShowStoredPictures] = useState<boolean>(false);
    const [webViewPath, setWebViewPath] = useState('');
    const [photoToDelete, setPhotoToDelete] = useState<Photo>();

    const photoStyle = { width: '30%', margin: "0 0 0 35%" };

    const [currentLatitude, setCurrentLatitude] = useState<number | undefined>(undefined);
    const [currentLongitude, setCurrentLongitude] = useState<number | undefined>(undefined);

    const { position, error } = useMyLocation();

    useEffect(() => {
        // Set current location if item doesn't have coordinates set
        if (position && currentLatitude === undefined && currentLongitude === undefined) {
            setCurrentLatitude(position.coords.latitude);
            setCurrentLongitude(position.coords.longitude);
        }
    }, [position, currentLatitude, currentLongitude]);

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
            setWebViewPath(found.webViewPath || "");
            setCurrentLatitude(found.latitude);
            setCurrentLongitude(found.longitude);
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
            isPublic,
            webViewPath,
            latitude:currentLatitude, longitude:currentLongitude
        };
        log('update', editedItem);
        updateItem && updateItem(editedItem).then(() => history.goBack());
    }, [itemToUpdate, name, description, noEmployees, openingDate, isPublic,webViewPath,currentLatitude,currentLongitude, updateItem, history]);

    log('render ItemEdit');

    async function handlePhotoChange() {
        const image = await takePhoto();
        if (!image) {
            setWebViewPath('');
        } else {
            setWebViewPath(image);
        }
    }

    const handleMapClick = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        setCurrentLatitude(latitude);
        setCurrentLongitude(longitude);
    };

    // callback pentru click pe marker (poți face ce vrei aici)
    const handleMarkerClick = ({ markerId, latitude, longitude }: { markerId: string; latitude: number; longitude: number }) => {
        console.log("Marker clicked:", markerId, latitude, longitude);
    };

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

                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>


                <br/>

                <IonLoading isOpen={saving} />
                {savingError && <div>{savingError.message || 'Failed to save item'}</div>}


                <div>
                    {currentLatitude !== undefined && currentLongitude !== undefined && (
                        <MyMap
                            lat={currentLatitude}
                            lng={currentLongitude}
                            onMapClick={({ latitude, longitude }) => {
                                setCurrentLatitude(latitude);
                                setCurrentLongitude(longitude);
                            }}
                            onMarkerClick={({ markerId, latitude, longitude }) => {
                                console.log("Marker clicked:", markerId, latitude, longitude);
                            }}
                        />
                    )}
                </div>


                <br/>
                <br/>
                <br/>
                <br/>
                <br/>
                <br/>


                <br/>
                {showStoredPictures &&
                    <div>
                        <IonGrid>
                            <IonRow>
                                {photos.map((photo, index) => (
                                    <IonCol size="6" key={index}>
                                        <IonImg onClick={() => setPhotoToDelete(photo)}
                                                src={photo.webviewPath}/>
                                    </IonCol>
                                ))}
                            </IonRow>
                        </IonGrid>
                        <IonActionSheet
                            isOpen={!!photoToDelete}
                            buttons={[{
                                text: 'Delete',
                                role: 'destructive',
                                icon: trash,
                                handler: () => {
                                    if (photoToDelete) {
                                        deletePhoto(photoToDelete);
                                        setPhotoToDelete(undefined);
                                    }
                                }
                            }, {
                                text: 'Cancel',
                                icon: 'close',
                                role: 'cancel'
                            }]}
                            onDidDismiss={() => setPhotoToDelete(undefined)}
                        />
                    </div>}

                {webViewPath && (<img style={photoStyle} onClick={handlePhotoChange} src={webViewPath} width={'250px'} height={'250px'}/>)}
                {!webViewPath && (
                    <IonFab vertical="bottom" horizontal="center" slot="fixed">
                        <IonFabButton onClick={handlePhotoChange}>
                            <IonIcon icon={camera}/>
                        </IonFabButton>
                    </IonFab>)}

            </IonContent>
        </IonPage>
    );
};

export default ItemEdit;
