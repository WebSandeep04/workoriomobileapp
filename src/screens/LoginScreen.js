import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearError } from '../store/slices/authSlice';
import { styles } from '../css/LoginScreenStyles';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // Redux hooks
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle Authentication Success & Splash
  useEffect(() => {
    if (isAuthenticated) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setIsPasswordVisible(false); // Reset
        navigation.replace('BottomTabs');
      }, 3000); // 3 seconds splash
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigation]);

  // Show error alert when there's an error
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    dispatch(loginUser({ email, password }));
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality will be implemented here');
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
        {/* Reuse Gradient for Splash */}
        <View style={styles.backgroundGradient}>
          <View style={styles.gradientCircle1} />
          <View style={styles.gradientCircle2} />
          <View style={styles.gradientCircle3} />
        </View>

        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoIcon}>💼</Text>
            </View>
            <Text style={styles.logo}>Workorio</Text>
            <Text style={styles.tagline}>Success!</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient}>
        <View style={styles.gradientCircle1} />
        <View style={styles.gradientCircle2} />
        <View style={styles.gradientCircle3} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: logoScale }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Text style={styles.logoIcon}>💼</Text>
              </View>
              <Text style={styles.logo}>Workorio</Text>
              <Text style={styles.tagline}>Your Work, Your Way</Text>
            </View>
          </Animated.View>

          {/* Login Form */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subtitleText}>Sign in to continue your journey</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  <Text style={styles.eyeButtonText}>
                    {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
              {isLoading && <View style={styles.loadingSpinner} />}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
