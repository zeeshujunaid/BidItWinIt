import {
  View,
  Text,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import Header from "../components/Header"


export default function Home() {

  return (
    <View  style={{flex:1,}}>
      <View style={{height:240, backgroundColor:"#000",width:"100%"}}>
      <Header/>
      </View>
      <Text>Home</Text>
    </View>
  );   
}
