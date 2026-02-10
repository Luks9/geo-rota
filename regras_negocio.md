# ⚖️ Regras de Negócio – GeoRota

## 💼 1. Cadastro de Funcionários

* **RN01:** Todo funcionário deve possuir **nome completo**, **CPF**, **endereço completo** (logradouro, número, bairro, cidade, UF e CEP) e **escala de trabalho** cadastrados.
* **RN02:** O cadastro deve conter os campos **possui CNH** e **apto a dirigir**, sendo que apenas quando ambos forem verdadeiros o funcionário poderá ser designado como motorista.
* **RN03:** Cada funcionário deve pertencer a uma **empresa** (ou filial) e poderá estar vinculado a apenas **um grupo de rota por dia**.
* **RN04:** A escala deve permitir variações por dia da semana (exemplo: segunda a sexta, terça a quinta etc.).

## 🚗 2. Cadastro de Veículos

* **RN05:** Cada veículo deve conter **tipo**, **capacidade máxima de passageiros**, **consumo médio** e **custo operacional por quilômetro**.
* **RN06:** Existem dois tipos padrão de veículos:

  * **Econômico:** capacidade máxima de **4 passageiros**, custo **baixo**.
  * **Sedan:** capacidade máxima de **5 passageiros**, custo **alto**.
* **RN07:** O sistema deve permitir a futura expansão para novos tipos de veículos (ex.: vans, micro-ônibus).

## 👨‍✈️ 3. Designação de Motoristas

* **RN08:** Apenas funcionários com **CNH válida** e **apto a dirigir** podem ser designados como motoristas.
* **RN09:** A escolha do motorista pode ser feita de forma **manual** (pelo administrador) ou **automática** (pelo algoritmo de otimização).
* **RN10:** Cada motorista pode realizar **apenas uma rota por turno** (ex.: manhã ou noite).

## 🗺️ 4. Geração e Otimização de Rotas

* **RN11:** O sistema deve calcular a **rota mais eficiente**, considerando:

  * distância entre os endereços,
  * tipo e capacidade dos veículos,
  * restrições de escala dos funcionários.
* **RN12:** As rotas devem iniciar e terminar na **empresa** (ponto base).
* **RN13:** Nenhuma rota pode ultrapassar a capacidade do veículo.
* **RN14:** O algoritmo deve tentar **minimizar a distância total percorrida** e **o custo operacional total**.
* **RN15:** Quando não houver motorista disponível, o administrador deve ser alertado.
* **RN16:** Quando um funcionário não puder ser alocado em nenhuma rota (por incompatibilidade de turno, distância ou capacidade), ele deve constar em uma **lista de pendências**.

## 🕐 5. Escalas, Turnos e Regimes

* **RN17:** As rotas devem respeitar a **disponibilidade semanal** de cada funcionário.
* **RN18:** Um mesmo funcionário não pode ser incluído em duas rotas **no mesmo horário**.
* **RN19:** O sistema deve permitir o registro de **turnos (manhã, tarde, noite)** para futuras expansões de lógica.
* **RN20:** Deve existir também o **grupo de rota por regime de embarque**, destinado a funcionários que embarcam em um dia específico e retornam em outro, podendo variar conforme a escala (exemplo: segunda a sexta, terça a quinta, etc.).

## 👩‍💻 6. Permissões e Perfis

* **RN21:** O **Administrador** pode cadastrar, editar e excluir funcionários, motoristas e veículos.
* **RN22:** O **Administrador** pode forçar a escolha de motorista e carro, ignorando a sugestão do algoritmo.
* **RN23:** Usuários comuns podem visualizar apenas as **rotas e horários** nos quais estão incluídos.

## 🧾 7. Logs e Auditoria

* **RN24:** Toda geração de rota deve ser registrada com **data, hora, número de funcionários, veículo e motorista designado**.
* **RN25:** Alterações manuais (como trocar motorista ou veículo) devem gerar **logs administrativos** para auditoria.
* **RN26:** Falhas ou inconsistências no cálculo de rotas devem ser registradas com **mensagem de erro detalhada**.

## 💡 8. Extensões Futuras

* **RN27:** Permitir integração com **APIs de mapas (Google Maps, OpenStreetMap)** para cálculo real de rotas e distâncias.
* **RN28:** Permitir visualização das rotas em um **mapa interativo (frontend)**.
* **RN29:** Implementar **otimização multiobjetivo** (minimizar custo + tempo).
* **RN30:** Incluir **relatórios gerenciais** com distâncias totais, custos médios e aproveitamento de veículos.
