import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import {RootStackParamList} from '../types/navigation';

type DetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Details'
>;

function DetailsScreen() {
  const navigation = useNavigation<DetailsScreenNavigationProp>();
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(360, {duration: 2000}),
        withTiming(0, {duration: 0}),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, {duration: 1000}),
        withTiming(1, {duration: 1000}),
      ),
      -1,
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{rotate: `${rotation.value}deg`}],
      opacity: opacity.value,
    };
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={animatedIconStyle}>
          <Icon name="info" size={64} color="#007AFF" />
        </Animated.View>

        <Text style={styles.title}>Details Screen</Text>
        <Text style={styles.description}>
          Đây là màn hình Details với các animation từ Reanimated
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Icon name="check-circle" size={24} color="#6BCF7F" />
            <Text style={styles.featureText}>React Navigation</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" size={24} color="#6BCF7F" />
            <Text style={styles.featureText}>Reanimated 3</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="check-circle" size={24} color="#6BCF7F" />
            <Text style={styles.featureText}>Vector Icons</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  featureList: {
    width: '100%',
    gap: 15,
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
});

export default DetailsScreen;

