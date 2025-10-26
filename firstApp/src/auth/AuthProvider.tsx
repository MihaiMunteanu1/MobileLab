import React, { useCallback, useEffect, useState } from 'react';
import { getLogger } from '../core';
import { login as loginApi } from './authApi';
import { Preferences } from '@capacitor/preferences';

const log = getLogger('AuthProvider');

type LoginFn = (username?: string, password?: string) => void;
type LogoutFn = () =>void;

export interface AuthState {
    authenticationError: Error | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    login?: LoginFn;
    logout?: LogoutFn;
    pendingAuthentication?: boolean;
    username?: string;
    password?: string;
    token: string;
    tokenFound: boolean;
    // marks that the provider finished checking persistent storage
    initialized?: boolean;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    pendingAuthentication: false,
    token: '',
    tokenFound: false,
    initialized: false,
};

export const AuthContext = React.createContext<AuthState>(initialState);

interface AuthProviderProps {
    children?: React.ReactNode,
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }: AuthProviderProps) => {
    const [state, setState] = useState<AuthState>(initialState);
    const { isAuthenticated, isAuthenticating, authenticationError, pendingAuthentication, token, tokenFound, initialized } = state;
    const login = useCallback<LoginFn>(loginCallback, []);
    const logout = useCallback<LogoutFn>(logoutCallback, []);

    // Handle explicit authentication flow (username/password)
    useEffect(authenticationEffect, [pendingAuthentication, tokenFound]);

    // On mount, try restoring the token from persistent storage and mark initialized
    useEffect(() => {
        let canceled = false;
        (async () => {
            try {
                const { value } = await Preferences.get({ key: 'token' });
                if (canceled) return;
                setState((s: AuthState) => ({
                    ...s,
                    token: value || '',
                    tokenFound: !!value,
                    isAuthenticated: !!value,
                    isAuthenticating: false,
                    pendingAuthentication: false,
                    initialized: true,
                }));
                log('token restored from storage:', !!value);
            } catch (e) {
                if (canceled) return;
                setState((s: AuthState) => ({ ...s, initialized: true }));
            }
        })();
        return () => { canceled = true; }
    }, []);

    const value = { isAuthenticated, login, logout, isAuthenticating, authenticationError, token, tokenFound, initialized };
    log('render');
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

    function loginCallback(username?: string, password?: string): void {
        log('login');
        setState((s: AuthState) => ({
            ...s,
            pendingAuthentication: true,
            username,
            password
        }));
    }

    function logoutCallback(): void {
        log('logout');
        Preferences.remove({key: 'token'});
        setState((s: AuthState) => ({
            ...s,
            token: '',
            isAuthenticated: false,
            tokenFound: false,
        }));
    }

    function authenticationEffect() {
        let canceled = false;
        authenticate();
        return () => {
            canceled = true;
        }

        async function authenticate() {
            if (!pendingAuthentication || tokenFound) {
                log('authenticate, !pendingAuthentication or tokenFound, return');
                return;
            }
            try {
                log('authenticate...');
                setState((s: AuthState) => ({
                    ...s,
                    isAuthenticating: true,
                }));
                const { username, password } = state;
                const { token } = await loginApi(username, password);
                if (canceled) {
                    return;
                }
                log('authenticate succeeded');

                await Preferences.set({key: 'token', value: token});

                setState((s: AuthState) => ({
                    ...s,
                    token,
                    pendingAuthentication: false,
                    isAuthenticated: true,
                    isAuthenticating: false,
                    tokenFound: true,
                }));
            } catch (error) {
                if (canceled) {
                    return;
                }
                log('authenticate failed');
                setState((s: AuthState) => ({
                    ...s,
                    authenticationError: error as Error,
                    pendingAuthentication: false,
                    isAuthenticating: false,
                }));
            }
        }
    }
};
