// import { useEffect, useState } from 'react';
// import { Geolocation, Position } from '@capacitor/geolocation';
//
// interface MyLocation {
//     position?: Position | null;
//     error?: Error;
// }
//
// export const useMyLocation = () => {
//     const [state, setState] = useState<MyLocation>({});
//     useEffect(() => {
//         watchMyLocation()
//     }, [setState]);
//     return state;
//
//     async function watchMyLocation() {
//         let cancelled = false;
//         let callbackId: string;
//         try {
//             const position = await Geolocation.getCurrentPosition();
//             updateMyPosition('current', position);
//         } catch (error) {
//             updateMyPosition('current', null, error);
//         }
//         callbackId = await Geolocation.watchPosition({}, (position, error) => {
//             updateMyPosition('watch', position, error);
//         });
//         return () => {
//             cancelled = true;
//             Geolocation.clearWatch({ id: callbackId });
//         };
//
//         function updateMyPosition(source: string, position?: Position | null, error: any = undefined) {
//             console.log(source, position, error);
//             if (!cancelled && (position || error)) {
//                 setState({ position, error });
//             }
//         }
//     }
// };

import { useEffect, useState } from 'react';
import { Position, Geolocation } from '@capacitor/geolocation';

interface MyLocation {
    position?: Position;
    error?: Error;
}

export const useMyLocation = () => {
    const [state, setState] = useState<MyLocation>({});
    useEffect(watchMyLocation, []);
    return state;

    function watchMyLocation() {
        let cancelled = false;
        Geolocation.getCurrentPosition()
            .then(position => updateMyPosition('current', position))
            .catch(error => updateMyPosition('current',undefined, error));
        const callbackId = Geolocation.watchPosition({}, (position, error) => {
            updateMyPosition('watch', position!, error);
        });
        return ()=>{ async () => {
            cancelled = true;
            Geolocation.clearWatch({ id: await callbackId });
        }
        };

        function updateMyPosition(source: string, position?: Position, error: any = undefined) {
            console.log(source, position, error);
            if (!cancelled) {
                setState({ ...state, position: position || state.position, error });
            }
        }
    }
};
