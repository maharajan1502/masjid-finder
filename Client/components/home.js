import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  StyleSheet,
  RefreshControl,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import { BASE_URL } from '../environment';
import CustomText from './CustomText'; 

const Home = ({ navigation }) => { 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pincode, setPincode] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [modalVisible, setModalVisible] = useState(false);

  const serviceTypes = ['Religious', 'Hotel', 'Hospital'];

  const fetchUserLocation = async () => {
    try {
      if (Platform.OS == 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to find services near you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
          return;
        }
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const pincode = await fetchPincodeFromCoordinates(latitude, longitude);
          sessionStorage.setItem('pincode',pincode)
          if (pincode) {
            setPincode(pincode);
          } else {
            Alert.alert('Error', 'Unable to fetch pincode from your location.');
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          Alert.alert('Error', 'Unable to fetch your location.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Unable to fetch your location.');
    }
  };

  const fetchPincodeFromCoordinates = async (latitude, longitude) => {
    const API_KEY = 'YOUR_OPENCAGE_API_KEY';
    const url = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=67d337c7e020a870411323hgva983bb`;

    try {
      const response = await axios.get(url);
      const results = response.data.address.postcode;
      return results;
    } catch (error) {
      console.error('Error fetching pincode:', error);
      return null;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}servicedetails`);
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // fetchData();
    fetchUserLocation();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSearch = async () => {
    if (!pincode || !selectedService) {
      alert('Please enter both a pincode and a service type.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}getservice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pincode, selectedService }),
      });

      const responseData = await response.json();
      setData(responseData.filteredServices);
    } catch (error) {
      console.error('Error during handleSearch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      location.reload();
    }, 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <CustomText style={styles.errorText}>Error: {error}</CustomText>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <CustomText style={styles.title}>Explore Services</CustomText>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter pincode"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="numeric"
          maxLength={6}
        />

        <TouchableOpacity
          style={styles.input}
          onPress={() => setModalVisible(true)}
        >
          <CustomText style={{ color: selectedService ? '#000' : '#888' }}>
            {selectedService || 'Select Service Type'}
          </CustomText>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {serviceTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedService(type);
                  setModalVisible(false);
                }}
              >
                <CustomText style={styles.modalText}>{type}</CustomText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModalVisible(false)}
            >
              <CustomText style={styles.modalCancelText}>Cancel</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <CustomText style={styles.searchButtonText}>Search</CustomText>
      </TouchableOpacity>

      <FlatList
        data={data}
        keyExtractor={(item) => item._id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Detailspage', { item })}>
            <View style={styles.card}>
              <CustomText style={styles.cardTitle}>{item.serviceName}</CustomText>
              <CustomText style={styles.cardSubtitle}>Pincode: {item.pincode}</CustomText>
            </View>
          </TouchableOpacity>
        )}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#e35b00',
    textAlign: 'center',
    marginBottom: 20,
    marginTop:30
  },
  searchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  input: {
    fontFamily:'Montserrat-Regular',
    flex: 1,
    height: 40,
    borderColor: '#e35b00',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  searchButton: {
    backgroundColor: '#e35b00',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontFamily:'Montserrat-Regular',
    fontSize: 18,
    // fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalText: {
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: 'red',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});

export default Home;