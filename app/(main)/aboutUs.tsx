import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- Data for the page (Expanded for pop-ups) ---
const officials = [
  { name: 'Ajaya Kumar', role: 'Project Guide', image: require('@/assets/images/ajaya.png') },
  { name: 'Frina P V', role: 'Developer', image: require('@/assets/images/frina.png') },
  { name: 'Jahana Sherin I K', role: 'Developer', image: require('@/assets/images/jahana.png') },
];

const values = [
  { 
    icon: 'lock-closed-outline', 
    title: 'Trust', 
    description: "Protecting every family's privacy.",
    // --- CHANGE: Added detailed content for the pop-up ---
    fullContent: "Drishti ensures that all sensitive information, including missing person reports and family details, is stored securely and only shared with verified authorities and NGOs. Families can rely on the platform to handle their data with the highest ethical standards."
  },
  { 
    icon: 'shield-checkmark-outline', 
    title: 'Security', 
    description: 'Verified access, secure data.',
    fullContent: "End-to-end encryption protects all data transfers between the app, police, and NGOs. Role-based access ensures that only authorized users can view or update sensitive reports, safeguarding against misuse."
  },
  { 
    icon: 'people-outline', 
    title: 'Collaboration', 
    description: 'NGOs, Police, Families — together.',
    fullContent: "Drishti connects police, NGOs, and families in a single platform, enabling coordinated search efforts, quicker verifications, and streamlined case tracking to improve recovery chances."
  },
  { 
    icon: 'search-outline', 
    title: 'Transparency', 
    description: 'Real-time updates, clear progress.',
    fullContent: "Real-time notifications and dashboards keep families and authorities informed of every step in the search process. Updates on verification, sightings, and matches are shared clearly to maintain trust."
  },
  { 
    icon: 'heart-outline', 
    title: 'Compassion', 
    description: 'Every life matters.',
    fullContent: "At the heart of Drishti is the belief that every missing person matters. The platform prioritizes empathy in communication and support, offering families both technological assistance and human care during their most difficult times."
  },
];

const stories = [
    { 
        quote: "'Drishti reunited my brother in 48 hours.' — Priya", 
        image: require('@/assets/images/story1.png'),
        fullStory: "Priya's brother, a teenager with special needs, went missing from a crowded market. The family was distraught. After filing a report, Drishti's AI system, monitoring public camera feeds, flagged a potential match at a railway station 50km away. An alert was sent to a local NGO volunteer who quickly verified the identity and safely reunited him with his family.",
    },
    { 
        quote: "'Thanks to verified NGOs, our child is safe.' — Rajesh's family", 
        image: require('@/assets/images/story2.png'),
        fullStory: "Rajesh's family reported their toddler missing from a park. A bystander, using the Drishti app, uploaded a photo of a child seen wandering alone nearby. The image was cross-referenced with the missing report. A verified NGO in the area received the high-probability alert, located the child within minutes, and cared for them until the police and family arrived. The verification system ensured no false alarms were sent to the family directly.",
    },
];

export default function AboutUsScreen() {
  // --- CHANGE: A more generic state to handle any type of modal content ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ type: '', data: {} as any });

  // --- CHANGE: A generic function to open the modal ---
  const openModal = (type: string, data: any) => {
    setModalContent({ type, data });
    setModalVisible(true);
  };
  
  // --- CHANGE: A helper function to render the correct content inside the modal ---
  const renderModalContent = () => {
    if (modalContent.type === 'story') {
        return (
            <>
                <Image source={modalContent.data.image} style={styles.modalImage} />
                <Text style={styles.modalQuote}>{modalContent.data.quote}</Text>
                <Text style={styles.modalFullStory}>{modalContent.data.fullStory}</Text>
            </>
        );
    }
    if (modalContent.type === 'value') {
        return (
            <>
                <Ionicons name={modalContent.data.icon as any} size={40} color="#3A0000" style={{ marginBottom: 15}} />
                <Text style={styles.modalQuote}>{modalContent.data.title}</Text>
                <Text style={styles.modalFullStory}>{modalContent.data.fullContent}</Text>
            </>
        );
    }
    return null; // Should not happen
  }

  return (
    <View style={{flex: 1}}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Intro Section */}
        <Text style={styles.mainTitle}>Smart detection, safe returns.</Text>
        <Text style={styles.bodyText}>
          Drishti's mission is to use AI, secure data, and trusted partnerships to reunite missing loved ones with their families — quickly and safely.
        </Text>
        <Image source={require('@/assets/images/familyillustration.png')} style={styles.mainImage} />
        <Text style={styles.bodyText}>
          Founded by technologists and social workers, Drishti bridges the gap between families, police, and NGOs through smart technology and real-time alerts.
        </Text>

        {/* Officials Section - Non-interactive */}
        <Text style={styles.sectionTitle}>Our Officials</Text>
        <View style={styles.officialsContainer}>
          {officials.map((official, index) => (
            <View key={index} style={styles.officialCard}>
              <Image source={official.image} style={styles.officialImage} />
              <Text style={styles.officialName}>{official.name}</Text>
              <Text style={styles.officialRole}>{official.role}</Text>
            </View>
          ))}
        </View>

        {/* Values Section */}
        <Text style={styles.sectionTitle}>Our Values</Text>
        <View style={styles.valuesContainer}>
          {values.map((value, index) => (
            // --- CHANGE: Calls the generic openModal function ---
            <TouchableOpacity key={index} style={styles.valueCard} onPress={() => openModal('value', value)}>
              <Ionicons name={value.icon as any} size={28} color="#3A0000" />
              <Text style={styles.valueTitle}>{value.title}</Text>
              <Text style={styles.valueDescription}>{value.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reunited Stories Section */}
        <Text style={styles.sectionTitle}>Reunited Stories</Text>
        <View style={styles.storiesContainer}>
          {stories.map((story, index) => (
              // --- CHANGE: Calls the generic openModal function ---
              <TouchableOpacity key={index} style={styles.storyCard} onPress={() => openModal('story', story)}>
                  <Image source={story.image} style={styles.storyImage} />
                  <Text style={styles.storyQuote}>{story.quote}</Text>
              </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Drishti - Missing Person Detection © 2025 Drishti Project
        </Text>
      </ScrollView>

      {/* --- CHANGE: The Modal now uses the renderModalContent function --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            {renderModalContent()}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (all previous styles are unchanged)
  container: {
    flex: 1,
    backgroundColor: '#FFFBF8',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3A0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5B4242',
    textAlign: 'center',
    marginBottom: 20,
  },
  mainImage: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3A0000',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  officialsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  officialCard: {
    alignItems: 'center',
    width: '30%',
  },
  officialImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  officialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3A0000',
    textAlign: 'center',
  },
  officialRole: {
    fontSize: 14,
    color: '#B94E4E',
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  valueCard: {
    width: '48%',
    backgroundColor: '#FFF8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E0E0',
    padding: 15,
    marginBottom: 15,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A0000',
    marginTop: 8,
  },
  valueDescription: {
    fontSize: 14,
    color: '#B94E4E',
    marginTop: 4,
  },
  storiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storyCard: {
    width: '48%',
    backgroundColor: '#F9F1F1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  storyQuote: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A0000',
    padding: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerText: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 12,
    color: '#B94E4E',
  },
  // --- MODAL STYLES ---
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 15,
  },
  modalQuote: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalFullStory: {
    fontSize: 16,
    color: '#5B4242',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#850a0a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});