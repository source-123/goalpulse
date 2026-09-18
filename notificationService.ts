import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ref, set } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (
  userEmail: string
): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('⚠️ Pas un vrai device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permission refusée');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GoalPulse',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#39FF14',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'a5273336-e9d5-4a7a-b5e5-05dcbc93fe55',
    });

    const token = tokenData.data;
    console.log('✅ Push token:', token);

    const userKey = getUserKey(userEmail);
    await set(ref(database, `users/${userKey}/pushToken`), {
      token,
      platform: Platform.OS,
      updatedAt: Date.now(),
    });

    return token;
  } catch (err: any) {
    console.error('❌ Erreur push:', err.message);
    return null;
  }
};

export const sendPushNotification = async (
  toUserKeys: string[],
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  if (toUserKeys.length === 0) return;

  try {
    const res = await fetch('https://goalpulse-aciq.onrender.com/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKeys: toUserKeys,
        title,
        body,
        data: data || {},
      }),
    });
    const json = await res.json();
    console.log('📤 Notif:', json);
  } catch (err: any) {
    console.error('❌ Erreur notif:', err.message);
  }
};
