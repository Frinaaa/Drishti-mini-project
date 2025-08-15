import { Link } from 'expo-router';
import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// The data for the cards. The href paths are correct because route groups like (auth)
// do not add to the URL.
const roles = [
	{
		title: 'Police Officer',
		desc: 'Access and manage missing person cases.',
		image: require('@/assets/images/police.png'),
		href: '/police-login', // Correct: Navigates to app/(auth)/police-login.tsx
	},
	{
		title: 'NGO Volunteer',
		desc: 'Assist in search and support efforts.',
		image: require('@/assets/images/ngo.png'),
		href: '/ngo-login', // Correct: Navigates to app/(auth)/ngo-login.tsx
	},
	{
		title: 'Family Member',
		desc: 'Report and track missing loved ones.',
		image: require('@/assets/images/family.png'),
		href: '/family-login', // Correct: Navigates to app/(auth)/family-login.tsx
	},
]as const;

export default function HomeScreen() {
	return (
		<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
			<View style={styles.header}>
				<Text style={styles.title}>Welcome to Drishti</Text>
				<Text style={styles.subtitle}>
					Connecting families, volunteers, and officers for faster reunions.
				</Text>
			</View>
			<View style={styles.cardsContainer}>
				{roles.map((role, index) => (
					<Link key={index} href={role.href} asChild>
						<TouchableOpacity style={styles.card}>
							<View style={styles.textBox}>
								<Text style={styles.role}>{role.title}</Text>
								<Text style={styles.desc}>{role.desc}</Text>
								<View style={styles.button}>
									<Text style={styles.buttonText}>Log In </Text>
								</View>
							</View>
							<Image source={role.image} style={styles.image} resizeMode="cover" />
						</TouchableOpacity>
					</Link>
				))}
			</View>
			<Text style={styles.footer}>© 2025 Drishti — Missing Person Detection System</Text>
		</ScrollView>
	);
}

// --- Styles are unchanged ---
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFF6F6',
		paddingHorizontal: 20,
	},
	header: {
		alignItems: 'center',
		marginTop: 20,
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