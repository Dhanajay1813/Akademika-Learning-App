import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from '../screens/SplashScreen';
import EntryScreen from '../screens/EntryScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RegisterAsScreen from '../screens/RegisterAsScreen';
import StudentRegistrationScreen from '../screens/StudentRegistrationScreen';
import GuestRegistrationScreen from '../screens/GuestRegistrationScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ExperimentsScreen from '../screens/ExperimentsScreen';
import ExperimentMenuScreen from '../screens/ExperimentMenuScreen';
import TechnicalDataScreen from '../screens/TechnicalDataScreen';
import ExperimentContentScreen from '../screens/ExperimentContentScreen';
import ReferenceSignalScreen from '../screens/ReferenceSignalScreen';
import CaptureImageScreen from '../screens/CaptureImageScreen';
import TableScreen from '../screens/TableScreen';
import GraphScreen from '../screens/GraphScreen';
import ObservationResultScreen from '../screens/ObservationResultScreen';
import GeneratePDFScreen from '../screens/GeneratePDFScreen';
import PdfPreviewScreen from '../screens/PdfPreviewScreen';
import WorkbookScreen from '../screens/WorkbookScreen';
import InternshipsScreen from '../screens/InternshipsScreen';
import InternshipApplicationScreen from '../screens/InternshipApplicationScreen';
import HelpAndAppTourScreen from '../screens/HelpAndAppTourScreen';
import AppTutorialScreen from '../screens/tutorial/AppTutorialScreen';
import { colors } from '../constants/colors';
import { AppRefreshProvider } from '../context/AppRefreshContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <AppRefreshProvider>
        <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: { color: colors.text, fontWeight: '800' },
            headerTintColor: colors.primary,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Entry" component={EntryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
          <Stack.Screen name="RegisterAs" component={RegisterAsScreen} options={{ title: 'Register As' }} />
          <Stack.Screen name="StudentRegistration" component={StudentRegistrationScreen} options={{ title: 'Student Registration' }} />
          <Stack.Screen name="GuestRegistration" component={GuestRegistrationScreen} options={{ title: 'Guest Registration' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerBackVisible: false }} />
          <Stack.Screen name="Products" component={ProductsScreen} />
          <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Product List' }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Detail' }} />
          <Stack.Screen name="Catalog" component={CatalogScreen} />
          <Stack.Screen name="Experiments" component={ExperimentsScreen} />
          <Stack.Screen name="ExperimentMenu" component={ExperimentMenuScreen} options={{ title: 'Experiment Menu' }} />
          <Stack.Screen name="TechnicalData" component={TechnicalDataScreen} options={{ title: 'Technical Data' }} />
          <Stack.Screen name="ExperimentContent" component={ExperimentContentScreen} options={{ title: 'Experiment Content' }} />
          <Stack.Screen name="ReferenceSignal" component={ReferenceSignalScreen} options={{ title: 'Reference Signal' }} />
          <Stack.Screen name="CaptureImage" component={CaptureImageScreen} options={{ title: 'Your Signal' }} />
          <Stack.Screen name="Table" component={TableScreen} />
          <Stack.Screen name="Graph" component={GraphScreen} />
          <Stack.Screen name="ObservationResult" component={ObservationResultScreen} options={{ title: 'Observation and Result' }} />
          <Stack.Screen name="GeneratePDF" component={GeneratePDFScreen} options={{ title: 'Generate PDF' }} />
          <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Workbook" component={WorkbookScreen} />
          <Stack.Screen name="Internships" component={InternshipsScreen} />
          <Stack.Screen name="InternshipApplication" component={InternshipApplicationScreen} options={{ title: 'Application' }} />
          <Stack.Screen name="HelpAndAppTour" component={HelpAndAppTourScreen} options={{ title: 'Help & App Tour' }} />
          <Stack.Screen name="AppTutorial" component={AppTutorialScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
        </NavigationContainer>
      </AppRefreshProvider>
    </SafeAreaProvider>
  );
}
