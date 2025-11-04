import {IonContent, IonHeader, IonLabel, IonList, IonPage, IonTitle, IonToolbar} from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Home.css';
import { useAppState } from './useAppState';
import { useNetwork } from './useNetwork';

const Home: React.FC = () => {
  const { appState } = useAppState();
  const { networkStatus } = useNetwork();

  return (
      <IonLabel>App state is {JSON.stringify(appState)} <br/> Network status
          is {JSON.stringify(networkStatus)}</IonLabel>
  );
};

export default Home;
