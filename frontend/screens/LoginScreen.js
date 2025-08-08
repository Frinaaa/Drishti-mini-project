export default function LoginScreen({ route }) {
  const role = route.params?.role || 'User';
  
  <Text style={styles.title}>{role} Login</Text>
  
}
