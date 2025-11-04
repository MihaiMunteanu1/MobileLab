import React, { useEffect, useRef } from "react";
import { GoogleMap } from "@capacitor/google-maps";
import { mapsApiKey } from "./mapsApiKey";

interface MyMapProps {
    lat: number;
    lng: number;
    onMapClick: (e: { latitude: number; longitude: number }) => void;
    onMarkerClick: (e: { markerId: string; latitude: number; longitude: number }) => void;
}

const MyMap: React.FC<MyMapProps> = ({ lat, lng, onMapClick, onMarkerClick }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<GoogleMap | null>(null);
    const markerIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        let canceled = false;

        const createMap = async () => {
            const map = await GoogleMap.create({
                id: "my-cool-map",
                element: mapRef.current!,
                apiKey: mapsApiKey,
                config: {
                    center: { lat, lng },
                    zoom: 4.5,
                },
            });
            mapInstance.current = map;

            markerIdRef.current = await map.addMarker({
                coordinate: { lat, lng },
                title: "Current position",
            });

            await map.setOnMapClickListener(async ({ latitude, longitude }) => {
                if (markerIdRef.current) {
                    await map.removeMarker(markerIdRef.current);
                }
                markerIdRef.current = await map.addMarker({
                    coordinate: { lat: latitude, lng: longitude },
                    title: "Current position",
                });
                console.log("Marker moved to:", latitude, longitude);
                onMapClick({ latitude, longitude });
            });

            await map.setOnMarkerClickListener(({ markerId, latitude, longitude }) => {
                console.log("Marker clicked at:", latitude, longitude);
                onMarkerClick({ markerId, latitude, longitude });
            });
        };

        createMap();

        return () => {
            canceled = true;
            mapInstance.current?.removeAllMapListeners();
        };
    }, []);

    return (
        <div
            ref={mapRef}
            style={{
                width: "100%",
                height: 300,
                display: "block",
            }}
        />
    );
};

export default MyMap;
