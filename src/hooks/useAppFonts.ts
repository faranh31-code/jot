import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts as useCalistogaFonts, Calistoga_400Regular } from '@expo-google-fonts/calistoga';

export function useAppFonts() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [calistogaLoaded] = useCalistogaFonts({ Calistoga_400Regular });

  return interLoaded && calistogaLoaded;
}
