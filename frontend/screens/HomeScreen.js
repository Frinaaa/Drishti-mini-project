import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const roles = [
  {
    title: 'Police Officer',
    desc: 'Access and manage missing person cases.',
<<<<<<< HEAD
    image: require('../assets/police.png'),
=======
    image: require('./assets/police.png'), // ✅ forward slash
>>>>>>> parent of 75e7d00 (aa)
  },
  {
    title: 'NGO Volunteer',
    desc: 'Assist in search and support efforts.',
<<<<<<< HEAD
    image: require('../assets/ngo.png'),
=======
    image: require('./assets/ngo.png'), // ✅ forward slash
>>>>>>> parent of 75e7d00 (aa)
  },
  {
    title: 'Family Member',
    desc: 'Report and track missing loved ones.',
<<<<<<< HEAD
    image: require('../assets/family.png'),
=======
    image: require('./assets/family.png'), // ✅ forward slash
>>>>>>> parent of 75e7d00 (aa)
  },
];

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Hamburger Menu */}
      <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
        <Ionicons name="menu" size={24} color="#000" />
      </TouchableOpacity>

      {/* Heading */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Drishti</Text>
        <Text style={styles.subtitle}>
          Connecting families, volunteers, and officers for faster reunions.
        </Text>
      </View>

      {/* Roles Section */}
      <View style={styles.cardsContainer}>
        {roles.map((role, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.textBox}>
              <Text style={styles.role}>{role.title}</Text>
              <Text style={styles.desc}>{role.desc}</Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  if (role.title === 'Police Officer') navigation.navigate('PoliceLogin');
                  if (role.title === 'NGO Volunteer') navigation.navigate('NGOLogin');
                  if (role.title === 'Family Member') navigation.navigate('FamilyLogin');
                }}
              >
                <Text style={styles.buttonText}>Log In / Sign Up</Text>
              </TouchableOpacity>
            </View>
            <Image source={role.image} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        © 2025 Drishti — Missing Person Detection System
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF6F6',
    paddingHorizontal: 20,
  },
  menuButton: {
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3A0000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: width * 0.85,
  },
  cardsContainer: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 2,
  },
  textBox: {
    flex: 1,
    paddingRight: 10,
  },
  role: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A0000',
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: '#880806',
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#F5EAEA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#3A0000',
    fontWeight: '600',
    fontSize: 13,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#880806',
    marginTop: 20,
  },
});
