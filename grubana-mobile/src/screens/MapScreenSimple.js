import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapScreenSimple() {
  const [location, setLocation] = useState(null);
  const [mapHTML, setMapHTML] = useState('');

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      console.log('✅ Got location:', currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  useEffect(() => {
    if (!location) return;

    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
            .controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .control-btn {
                background: #007AFF;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <div class="controls">
            <button class="control-btn" onclick="toggleTest()">🔴 TEST BUTTON</button>
        </div>

        <script>
            console.log('🟦 SIMPLE MAP: Starting initialization...');
            
            // Initialize map
            const map = L.map('map').setView([${lat}, ${lng}], 14);
            console.log('🟦 SIMPLE MAP: Map created');
            
            // Add tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            console.log('🟦 SIMPLE MAP: Tiles added');
            
            // Add user location marker
            L.marker([${lat}, ${lng}])
                .addTo(map)
                .bindPopup('📍 Your Location');
            console.log('🟦 SIMPLE MAP: User marker added');
            
            // Add test truck marker
            const truckIcon = L.divIcon({
                html: '<div style="background: #ff0000; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid white;">🚛</div>',
                iconSize: [40, 40],
                className: 'truck-marker'
            });
            
            L.marker([${lat + 0.001}, ${lng + 0.001}], { icon: truckIcon })
                .addTo(map)
                .bindPopup('🚛 Test Truck');
            console.log('🟦 SIMPLE MAP: Truck marker added');
            
            // Add test event marker
            const eventIcon = L.divIcon({
                html: '<div style="background: #00ff00; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid white;">🎪</div>',
                iconSize: [40, 40],
                className: 'event-marker'
            });
            
            L.marker([${lat - 0.001}, ${lng - 0.001}], { icon: eventIcon })
                .addTo(map)
                .bindPopup('🎪 Test Event');
            console.log('🟦 SIMPLE MAP: Event marker added');
            
            // Test button function
            let buttonState = false;
            function toggleTest() {
                buttonState = !buttonState;
                const button = document.querySelector('.control-btn');
                button.textContent = buttonState ? '🟢 BUTTON ON' : '🔴 BUTTON OFF';
                console.log('🟦 SIMPLE MAP: Button toggled to', buttonState);
            }
            
            console.log('🟦 SIMPLE MAP: All markers should be visible now!');
        </script>
    </body>
    </html>
    `;

    setMapHTML(html);
  }, [location]);

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text>Getting location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHTML }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => {
          const message = JSON.parse(event.nativeEvent.data);
          console.log('📱 SIMPLE MAP: Message from WebView:', message);
        }}
        onError={(error) => {
          console.error('📱 SIMPLE MAP: WebView error:', error);
        }}
        onLoadEnd={() => {
          console.log('📱 SIMPLE MAP: WebView loaded');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
