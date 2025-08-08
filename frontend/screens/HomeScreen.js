import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

const roles = [
  {
    title: 'Police Officer',
    desc: 'Access and manage missing person cases.',
    image: require('../assets/police.png'),
  },
  {
    title: 'NGO Volunteer',
    desc: 'Assist in search and support efforts.',
    image: require('../assets/ngo.png'),
  },
  {
    title: 'Family Member',
    desc: 'Report and track missing loved ones.',
    image: require('../assets/family.png'),
  },
];

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Heading Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Drishti</Text>
        <Text style={styles.subtitle}>
          Connecting families, volunteers, and officers for faster reunions.
        </Text>
      </View>

      {/* Cards Section */}
      <View style={styles.cardsContainer}>
        {roles.map((role, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.textBox}>
              <Text style={styles.role}>{role.title}</Text>
              <Text style={styles.desc}>{role.desc}</Text>

              {role.title === 'Police Officer' && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.navigate('PoliceLogin')}
                >
                  <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>
              )}
            </View>
            <Image source={role.image} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height,
    backgroundColor: '#FCF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    position: 'absolute',
    top: 80,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3A0000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  cardsContainer: {
    marginTop: 100,
    width: '100%',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    overflow: 'hidden',
    elevation: 3,
  },
  textBox: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  role: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A0000',
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: '#880806',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#FCF7F7',
    borderColor: '#880806',
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#880806',
    fontWeight: '600',
  },
  image: {
    width: 100,
    height: 100,
  },
});
