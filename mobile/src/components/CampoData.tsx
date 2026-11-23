import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Temporal } from '@js-temporal/polyfill';
import { usePreferences } from '../context/PreferencesContext';
import { Botao } from '../navigation/FoundationScreens';
import { controleMinimo, espacos } from '../theme/spacing';
import { tipografia } from '../theme/typography';
import { formatarData, interpretarData, mascaraData } from '../utils/sleepForm';
import { CampoDiario } from './DiarioFields';

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasDaSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type Props = Omit<ComponentProps<typeof CampoDiario>, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (valor: string) => void;
  somenteMes?: boolean;
};

export function CampoData({ value, onChangeText, somenteMes = false, ...campo }: Props) {
  const { paleta } = usePreferences();
  const [mes, definirMes] = useState<Temporal.PlainYearMonth | null>(null);
  const [modo, definirModo] = useState<'dias' | 'meses' | 'digitar'>('dias');
  const [texto, definirTexto] = useState('');
  const label = campo.accessibilityLabel ?? campo.rotulo;
  const formato = somenteMes ? 'MM/AAAA' : 'DD/MM/AAAA';
  const selecionada = interpretarData(somenteMes ? `01/${value}` : value);

  function abrir() {
    if (campo.editable === false) return;
    Keyboard.dismiss();
    definirTexto(value);
    definirModo(somenteMes ? 'meses' : 'dias');
    definirMes(Temporal.PlainYearMonth.from((selecionada ?? Temporal.Now.plainDateISO().toString()).slice(0, 7)));
  }

  function fechar() {
    definirMes(null);
  }

  function escolher(valor: string) {
    fechar();
    onChangeText(valor);
  }

  function alterarTexto(valor: string) {
    if (somenteMes) {
      const digitos = valor.replace(/\D/g, '').slice(0, 6);
      definirTexto([digitos.slice(0, 2), digitos.slice(2)].filter(Boolean).join('/'));
    } else {
      definirTexto(mascaraData(valor));
    }
  }

  function escolherMes(mesEscolhido: number) {
    if (!mes) return;
    const novoMes = mes.with({ month: mesEscolhido });
    if (somenteMes) {
      const data = formatarData(novoMes.toPlainDate({ day: 1 }).toString());
      escolher(data.slice(3));
    } else {
      definirMes(novoMes);
      definirModo('dias');
    }
  }

  function celula(textoCelula: string, descricao: string, ativo: boolean, acao: () => void) {
    return (
      <Pressable key={descricao} accessibilityRole="button" accessibilityLabel={descricao}
        accessibilityState={{ selected: ativo }} onPress={acao}
        style={[css.celula, modo === 'meses' ? css.colunaMes : css.colunaDia,
          ativo && { backgroundColor: paleta.primario }]}>
        <Text style={[tipografia.rotulo, { color: ativo ? paleta.sobrePrimario : paleta.texto, textAlign: 'center' }]}>{textoCelula}</Text>
      </Pressable>
    );
  }

  return (
    <>
      <CampoDiario {...campo} value={value} placeholder={formato} showSoftInputOnFocus={false}
        accessibilityHint="Abre o calendário com a opção de digitar." onPressIn={abrir} onAccessibilityTap={abrir} />
      {mes && (
        <Modal transparent animationType="fade" onRequestClose={fechar}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={css.fundo}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={css.centralizar}>
              <View accessibilityViewIsModal style={[css.painel, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
                <Text accessibilityRole="header" style={[tipografia.subtitulo, { color: paleta.texto }]}>{label}</Text>
                {modo === 'digitar' ? (
                  <>
                    <CampoDiario rotulo={formato} value={texto} onChangeText={alterarTexto} autoFocus keyboardType="number-pad"
                      onSubmitEditing={() => escolher(texto)} returnKeyType="done" />
                    <Botao titulo="Usar data digitada" onPress={() => escolher(texto)} />
                    <Botao titulo="Voltar ao calendário" secundario onPress={() => definirModo(somenteMes ? 'meses' : 'dias')} />
                  </>
                ) : (
                  <>
                    <View style={css.navegacao}>
                      <Pressable accessibilityRole="button" accessibilityLabel={modo === 'meses' ? 'Ano anterior' : 'Mês anterior'}
                        disabled={mes.year === 1 && (modo === 'meses' || mes.month === 1)}
                        onPress={() => definirMes(mes.subtract(modo === 'meses' ? { years: 1 } : { months: 1 }))} style={css.seta}>
                        <Text style={[tipografia.subtitulo, { color: paleta.primario }]}>‹</Text>
                      </Pressable>
                      {modo === 'dias' ? (
                        <Pressable accessibilityRole="button" accessibilityHint="Escolher mês e ano" style={css.seta}
                          onPress={() => definirModo('meses')}>
                          <Text style={[tipografia.rotulo, { color: paleta.primario, textAlign: 'center' }]}>{meses[mes.month - 1]} de {mes.year}</Text>
                        </Pressable>
                      ) : <Text accessibilityRole="header" style={[tipografia.rotulo, { color: paleta.texto }]}>{mes.year}</Text>}
                      <Pressable accessibilityRole="button" accessibilityLabel={modo === 'meses' ? 'Próximo ano' : 'Próximo mês'}
                        disabled={mes.year === 9999 && (modo === 'meses' || mes.month === 12)}
                        onPress={() => definirMes(mes.add(modo === 'meses' ? { years: 1 } : { months: 1 }))} style={css.seta}>
                        <Text style={[tipografia.subtitulo, { color: paleta.primario }]}>›</Text>
                      </Pressable>
                    </View>
                    {modo === 'meses' ? (
                      <View style={css.grade}>
                        {meses.map((nome, indice) => celula(nome, `${nome} de ${mes.year}`,
                          selecionada?.startsWith(mes.with({ month: indice + 1 }).toString()) ?? false,
                          () => escolherMes(indice + 1)))}
                      </View>
                    ) : (
                      <View style={css.grade}>
                        {diasDaSemana.map((dia) => (
                          <Text key={dia} style={[css.colunaDia, { color: paleta.textoSecundario, textAlign: 'center' }]}>{dia}</Text>
                        ))}
                        {Array.from({ length: mes.toPlainDate({ day: 1 }).dayOfWeek - 1 }, (_, indice) => (
                          <View key={`espaco-${indice}`} style={css.colunaDia} />
                        ))}
                        {Array.from({ length: mes.daysInMonth }, (_, indice) => {
                          const dia = indice + 1;
                          const iso = mes.toPlainDate({ day: dia }).toString();
                          const formatada = formatarData(iso);
                          return celula(String(dia), formatada, iso === selecionada, () => escolher(formatada));
                        })}
                      </View>
                    )}
                    <Botao titulo={somenteMes ? 'Digitar mês e ano' : 'Digitar data'} secundario onPress={() => definirModo('digitar')} />
                  </>
                )}
                <Botao titulo="Cancelar" secundario onPress={fechar} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </>
  );
}

const css = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#0009' },
  centralizar: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: espacos.sm },
  painel: { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: 16, padding: espacos.md, gap: espacos.sm },
  navegacao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seta: { minWidth: controleMinimo, minHeight: controleMinimo, justifyContent: 'center', alignItems: 'center', flexShrink: 1 },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  colunaDia: { width: '14.28%' },
  colunaMes: { width: '33.33%' },
  celula: { minHeight: controleMinimo, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
});
