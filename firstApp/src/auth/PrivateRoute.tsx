import React, { useContext } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { AuthContext, AuthState } from './AuthProvider';
import { getLogger } from '../core';

const log = getLogger('Login');

export interface PrivateRouteProps {
  component: any;
  path: string;
  exact?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, initialized } = useContext<AuthState>(AuthContext);
  log('render, isAuthenticated', isAuthenticated);
  return (
    <Route {...rest} render={props => {
      // wait for auth provider to restore token from storage
      if (!initialized) {
        return null;
      }
      if (isAuthenticated) {
        return <Component {...props} />;
      }
      return <Redirect to={{ pathname: '/login' }}/>
    }}/>
  );
}
