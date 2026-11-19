import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BlocoDiario } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { formatarHorario } from '../../utils/horario';

export function Routine({ navigation }: NativeStackScreenProps<RootStackParamList, 'Routine'>) {
  const { metaMin } = usePreferences();

  return (
    <Tela titulo="Preparar a rotina">
      <BlocoDiario titulo="Horário desejado para deitar">
        <Texto>{metaMin === null ? 'Você pode escolher um horário que combine com sua rotina.' : formatarHorario(metaMin)}</Texto>
        <Botao titulo={metaMin === null ? 'Definir horário' : 'Ajustar horário'} secundario onPress={() => navigation.navigate('Settings')} />
      </BlocoDiario>
      <Texto>O que você quer deixar pronto antes de deitar? Escolha um passo que caiba na sua noite, como separar o que precisa para amanhã.</Texto>
      <Botao titulo="Registrar uma noite" secundario onPress={() => navigation.navigate('SleepForm')} />
    </Tela>
  );
}
