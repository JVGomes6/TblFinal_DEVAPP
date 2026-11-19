import { BlocoDiario } from '../../components/DiarioFields';
import { Tela, Texto } from '../../navigation/FoundationScreens';

export function Privacy() {
  return (
    <Tela titulo="Privacidade">
      <Texto>EntreNoites é um projeto acadêmico da disciplina de Desenvolvimento de Aplicações para Dispositivos Móveis da UFPR. Use dados fictícios nesta instalação de avaliação.</Texto>
      <BlocoDiario titulo="Conta e armazenamento">
        <Texto>Usamos seu e-mail para identificar a conta. O servidor guarda uma versão protegida da senha, suas preferências e a versão e data da sua decisão sobre o diário. O app usa o armazenamento seguro do dispositivo para guardar o token de sessão.</Texto>
        <Texto>Os dados da conta e do diário ficam no banco PostgreSQL do servidor. Nesta avaliação, o banco usado no ensaio é local.</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="O que entra no diário">
        <Texto>Ao aceitar, você autoriza guardar o fuso, os horários e a qualidade do sono que informar para consultar seu diário, acompanhar a rotina e ver os resumos. Humor, cansaço, minutos acordado, despertares, fatores da noite e anotações são opcionais.</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="Reflexão com Google Gemini">
        <Texto>O cartão é opcional. Quando a reflexão estiver disponível, você poderá conferir a prévia e autorizar cada envio à API externa do Google Gemini.</Texto>
        <Texto>Do diário, o Google recebe apenas categorias agregadas de foco, cobertura e, em alguns casos, um fator observado. A contagem exata de noites, a observação exibida, o e-mail, os identificadores, as datas, os horários e as notas ficam no EntreNoites.</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="Suas escolhas">
        <Texto>Você pode consultar, corrigir ou apagar noites no diário. Em Configurações, retirar o consentimento apaga as noites e o horário desejado e mantém a conta disponível. Se voltar a autorizar, o diário começa vazio.</Texto>
        <Texto>Excluir a conta remove o cadastro, as preferências e o diário do banco e encerra a sessão. A política e as opções da conta ficam disponíveis mesmo se você recusar o termo.</Texto>
        <Texto>A identificação do responsável e o canal de atendimento da instalação serão divulgados antes do uso com dados reais.</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="Sobre este diário">
        <Texto>Os resumos usam apenas os registros que você preenche. A duração é uma estimativa. Se quiser ajuda para interpretar seu sono, você pode conversar com um profissional de saúde.</Texto>
      </BlocoDiario>
    </Tela>
  );
}
