import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

// ✅ Preload images at the top for cleaner paths and error prevention
const images = {
  familyIllustration: require('../assets/family-illustration.png'),
  ajaya: require('../assets/ajaya.png'),
  frina: require('../assets/frina.png'),
  jahana: require('../assets/jahana.png'),
  story1: require('../assets/story1.png'),
  story2: require('../assets/story2.png'),
};

export default function AboutUsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>About Us</Text>

      <View style={styles.section}>
        <Text style={styles.title}>Smart detection, safe returns.</Text>
        <Text style={styles.paragraph}>
          Drishti’s mission is to use AI, secure data, and trusted partnerships
          to reunite missing loved ones with their families — quickly and safely.
        </Text>
        <Image source={images.familyIllustration} style={styles.heroImage} />
        <Text style={styles.paragraph}>
          Founded by technologists and social workers, Drishti bridges the gap
          between families, police, and NGOs through smart technology and real-time alerts.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Officials</Text>
        <View style={styles.officialsList}>
          {[
            { name: 'Ajaya Kumar', role: 'Project Guide', image: images.ajaya },
            { name: 'Frina P V', role: 'Developer', image: images.frina },
            { name: 'Jahana Sherin K', role: 'Developer', image: images.jahana },
          ].map((official, i) => (
            <View key={i} style={styles.officialCard}>
              <Image source={official.image} style={styles.officialImage} />
              <Text style={styles.officialName}>{official.name}</Text>
              <Text style={styles.officialRole}>{official.role}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Values</Text>
        <View style={styles.valuesGrid}>
          {[
            { icon: '🔒', title: 'Trust', desc: 'Protecting every family’s privacy.' },
            { icon: '🛡', title: 'Security', desc: 'Verified access, secure data.' },
            { icon: '🤝', title: 'Collaboration', desc: 'NGOs, Police, Families — together.' },
            { icon: '🔍', title: 'Transparency', desc: 'Real-time updates, clear progress.' },
            { icon: '❤️', title: 'Compassion', desc: 'Every life matters.' },
          ].map((value, i) => (
            <View key={i} style={styles.valueCard}>
              <Text style={styles.valueIcon}>{value.icon}</Text>
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDesc}>{value.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reunited Stories</Text>
        <View style={styles.storyList}>
          <View style={styles.storyCard}>
            <Image source={images.story1} style={styles.storyImage} />
            <Text style={styles.storyText}>
              ‘Drishti reunited my brother in 48 hours.’ — <Text style={{ fontWeight: 'bold' }}>Priya</Text>
            </Text>
          </View>
          <View style={styles.storyCard}>
            <Image source={images.story2} style={styles.storyImage} />
            <Text style={styles.storyText}>
              ‘Thanks to verified NGOs, our child is safe.’ — <Text style={{ fontWeight: 'bold' }}>Rajesh’s family</Text>
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        Drishti – Missing Person Detection © 2025 Drishti Project
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FCF7F7',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3A0000',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  heroImage: {
    width: '100%',
    height: 180,
    marginBottom: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#880806',
    marginBottom: 15,
    textAlign: 'center',
  },
  officialsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  officialCard: {
    alignItems: 'center',
    width: 100,
  },
  officialImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  officialName: {
    fontWeight: '600',
    color: '#3A0000',
    marginBottom: 2,
    textAlign: 'center',
  },
  officialRole: {
    fontSize: 12,
    color: '#880806',
    textAlign: 'center',
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  valueCard: {
    width: '40%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
  },
  valueIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  valueTitle: {
    fontWeight: '700',
    color: '#3A0000',
    marginBottom: 6,
    textAlign: 'center',
  },
  valueDesc: {
    fontSize: 12,
    color: '#880806',
    textAlign: 'center',
  },
  storyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  storyText: {
    flex: 1,
    fontSize: 14,
    color: '#3A0000',
  },
  footer: {
    textAlign: 'center',
    color: '#880806',
    marginTop: 30,
    fontSize: 12,
  },
});
