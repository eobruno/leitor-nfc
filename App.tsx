
import React from 'react';
import { StyleSheet, Text, View, Platform, StatusBar} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import Navigation from './src/routes/Navigation';
import colors from './src/constants/Colors';


export default function App() {
  
  return (
    <SafeAreaProvider>
      <StatusBar 
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} 
          backgroundColor={colors.BACKGROUND} 
          translucent={true}
        />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.BACKGROUND }}>
          <Navigation />
      </SafeAreaView>
    </SafeAreaProvider>
  );
  
}
