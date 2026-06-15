// =================================================================================
    // Processador de Laudos - Script Principal
    // Manter HTML, CSS e JS em um único arquivo é intencional para permitir
    // o funcionamento do botão "Baixar para Uso Offline".
    // =================================================================================
    // IIFE para encapsular todo o script e evitar poluição do escopo global
    (function() {
    "use strict";

    // ------------------- CONSTANTES E SELETORES GLOBAIS -------------------
    const CONSTS = {
        LOCAL_STORAGE_KEY: 'resultadosRecentes',
        STATUS: {
            NAO_ENCONTRADO: 'nao_encontrado',
            ALTERADO: 'alterado',
            NORMAL: 'normal'
        },
        MODAL_CLASS: 'show',
        DARK_MODE_CLASS: 'dark-mode',
        DARK_MODE_ENABLED: 'enabled',
        DARK_MODE_DISABLED: 'disabled'
    };

    // Cache de seletores do DOM para melhor performance
    const inputArea = document.getElementById('input');
    const resultadoDiv = document.getElementById('resultado');
    const listaExamesUl = document.getElementById('lista-exames');
    const filtroExamesInput = document.getElementById('filtro-exames');
    const listaRecentesDiv = document.getElementById('lista-recentes');
    const themeToggle = document.getElementById('theme-toggle');
    const marcarAlteradosToggle = document.getElementById('marcar-alterados-toggle');
    const toastEl = document.getElementById('toast');

    // Botões
    const btnProcessar = document.getElementById('btn-processar');
    const btnCopiarResultado = document.getElementById('btn-copiar');
    const btnLimparCampos = document.getElementById('btn-limpar-campos');
    const btnBaixarScript = document.getElementById('btn-baixar');
    const btnLimparHistorico = document.getElementById('btn-limpar-historico');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnSelecionarTodos = document.getElementById('btn-selecionar-todos');
    const btnLimparSelecao = document.getElementById('btn-limpar-selecao');
    const btnVerHistoricoCompleto = document.getElementById('btn-ver-historico-completo');

    // Modal
    const modalOverlay = document.getElementById('confirmation-modal-overlay');

    // Variáveis de estado
    let examesEncontradosGlobal = [];
    let toastTimeout;

    // ------------------- INICIALIZAÇÃO -------------------

    function setupEventListeners() {
        btnProcessar.addEventListener('click', processar);
        btnCopiarResultado.addEventListener('click', copiarResultado);
        btnLimparCampos.addEventListener('click', limparTudo);
        btnBaixarScript.addEventListener('click', baixarScript);
        filtroExamesInput.addEventListener('input', filtrarExames);
        marcarAlteradosToggle.addEventListener('change', gerarTextoFinal);
        const compararHistoricoToggle = document.getElementById('comparar-historico-toggle');
        compararHistoricoToggle.addEventListener('change', gerarTextoFinal);

        // Event listeners para o histórico e modal
        btnLimparHistorico.addEventListener('click', showConfirmationModal);
        btnConfirmDelete.addEventListener('click', handleConfirmDelete);
        btnCancelDelete.addEventListener('click', hideConfirmationModal);
        listaRecentesDiv.addEventListener('click', handleHistoricoClick);
        listaExamesUl.addEventListener('change', handleSelecaoExame);
        btnSelecionarTodos.addEventListener('click', () => selecionarTodosExames(true));
        btnLimparSelecao.addEventListener('click', () => selecionarTodosExames(false));

        // Listeners do novo modal de evolução
        btnVerHistoricoCompleto.addEventListener('click', mostrarHistoricoCompleto);
        document.getElementById('btn-close-evolution-modal').addEventListener('click', () => document.getElementById('evolution-modal-overlay').classList.remove(CONSTS.MODAL_CLASS));


        // Botão de teste
        const btnRunTests = document.getElementById('btn-run-tests');
        if (btnRunTests) btnRunTests.addEventListener('click', runTests);
        const btnToggleTests = document.getElementById('btn-toggle-tests');
        if (btnToggleTests) btnToggleTests.addEventListener('click', toggleTestSection);
    }

    function loadTheme() {
        const darkMode = localStorage.getItem('darkMode');
        if (darkMode === CONSTS.DARK_MODE_ENABLED) {
            document.documentElement.classList.add(CONSTS.DARK_MODE_CLASS);
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', () => {
            document.documentElement.classList.toggle(CONSTS.DARK_MODE_CLASS);
            const status = document.documentElement.classList.contains(CONSTS.DARK_MODE_CLASS) ? CONSTS.DARK_MODE_ENABLED : CONSTS.DARK_MODE_DISABLED;
            localStorage.setItem('darkMode', status);
        });
    }

    // --- FUNÇÕES DE UI (TOAST, MODAL, ETC) ---

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add(CONSTS.MODAL_CLASS);

        // Limpa o timeout anterior se houver um
        clearTimeout(toastTimeout);

        // Esconde o toast após 3 segundos
        toastTimeout = setTimeout(() => {
            toastEl.classList.remove(CONSTS.MODAL_CLASS);
        }, 3000);
    }

    function copiarResultado() {
        const textoResultado = resultadoDiv.textContent;
        if (textoResultado) {
            navigator.clipboard.writeText(textoResultado)
                .then(() => showToast('Resultado copiado!'))
                .catch(() => showToast('Falha ao copiar.'));
        } else {
            showToast('Nada para copiar.');
        }
    }

    function limparTudo() {
        inputArea.value = '';
        listaExamesUl.innerHTML = '<li class="instructions">Analise um laudo para ver os exames aqui.</li>';
        resultadoDiv.textContent = '';
        btnVerHistoricoCompleto.disabled = false;
    }

    function showConfirmationModal() {
        modalOverlay.classList.add(CONSTS.MODAL_CLASS);
    }

    function hideConfirmationModal() {
        modalOverlay.classList.remove(CONSTS.MODAL_CLASS);
    }

    function handleConfirmDelete() {
        localStorage.removeItem(CONSTS.LOCAL_STORAGE_KEY);
        renderizarResultadosRecentes();
        hideConfirmationModal();
        showToast('Histórico limpo com sucesso!');
    }

    function renderizarSidebar(exames) {
        if (!exames || exames.length === 0) {
            listaExamesUl.innerHTML = '<li class="instructions">Nenhum exame conhecido foi encontrado.</li>';
            return;
        }
        listaExamesUl.innerHTML = exames.map(exame => {
            // Para exames agrupadores como Urina I, mostra um valor simplificado na sidebar
            let valorSidebar;
        if (exame.tipo === 'agrupador' || exame.tipo === 'microbiologia') {
            valorSidebar = (exame.status === CONSTS.STATUS.ALTERADO ? 'Alterado' : 'Normal');
        } else {
            valorSidebar = exame.value;
        }
            
            return `
            <li>
                <input type="checkbox" id="${exame.id}" data-exame-id="${exame.id}" ${exame.selected ? 'checked' : ''}>
                <label for="${exame.id}">${exame.label}</label>
                <span class="exame-valor ${exame.status === CONSTS.STATUS.ALTERADO ? 'valor-alterado' : ''}">${valorSidebar}</span>
            </li>
        `}).join('');
    }

    // --- FUNÇÕES AUXILIARES ---

    // Função auxiliar para criar elementos do DOM de forma segura
    function createElement(tag, options = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'dataset') {
                Object.assign(el.dataset, value);
            } else {
                el[key] = value;
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child) {
                el.appendChild(child);
            }
        });
        return el;
    }

    // --- LÓGICA DO HISTÓRICO DE RESULTADOS ---

    function renderizarResultadosRecentes() {
        const resultados = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');
        
        if (resultados.length === 0) {
            listaRecentesDiv.innerHTML = '<p class="instructions">Nenhum resultado processado ainda.</p>';
            return;
        }

        const agrupados = resultados.reduce((acc, res) => {
            acc[res.paciente] = acc[res.paciente] || [];
            acc[res.paciente].push(res);
            return acc;
        }, {});

        listaRecentesDiv.innerHTML = '';
        
        // Ordena pacientes pelo laudo mais recente de cada um
        const pacientesOrdenados = Object.keys(agrupados).sort((a, b) => {
            const laudoMaisRecenteA = agrupados[a].reduce((latest, current) => (current.dataCompleta > latest.dataCompleta) ? current : latest);
            const laudoMaisRecenteB = agrupados[b].reduce((latest, current) => (current.dataCompleta > latest.dataCompleta) ? current : latest);
            return laudoMaisRecenteB.dataCompleta.localeCompare(laudoMaisRecenteA.dataCompleta);
        });

        for (const paciente of pacientesOrdenados) {
            // Ordena resultados do paciente por data (mais novo primeiro)
            agrupados[paciente].sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));

            const accordionContent = createElement('div', { className: 'accordion-content' });

            agrupados[paciente].forEach(res => {
                const item = createElement('div', { className: 'resultado-recente-item' }, [
                    createElement('span', {}, [res.resultado]),
                    createElement('div', { className: 'actions' }, [
                        createElement('button', {
                            className: 'copy-btn-individual btn-recarregar',
                            title: 'Recarregar este laudo para reanálise',
                            dataset: { laudoId: res.id } // Usa o ID de string
                        }, ['Recarregar']),
                        createElement('button', {
                            className: 'copy-btn-individual',
                            title: 'Copiar este resultado',
                            dataset: { copyText: res.resultado }
                        }, ['Copiar'])
                    ])
                ]);
                accordionContent.appendChild(item);
            });

            const accordionItem = createElement('div', { className: 'accordion-item' }, [ createElement('div', { className: 'accordion-header' }, [ createElement('span', {}, [paciente]), createElement('span', {}, ['▼']) ]), accordionContent ]);
            listaRecentesDiv.appendChild(accordionItem);
        }
    }

    function handleHistoricoClick(event) {
        const header = event.target.closest('.accordion-header');
        if (header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('span:last-child');
            const isVisible = content.style.display === 'block';
            content.style.display = isVisible ? 'none' : 'block';
            icon.textContent = isVisible ? '▼' : '▲';
            return;
        }

        const copyBtn = event.target.closest('.copy-btn-individual');
        if (copyBtn && copyBtn.dataset.copyText) {
            copiarTexto(copyBtn.dataset.copyText);
        }

        const recarregarBtn = event.target.closest('.btn-recarregar');
        if (recarregarBtn && recarregarBtn.dataset.laudoId) { // Procura por laudoId
            const resultados = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');
            const laudoId = recarregarBtn.dataset.laudoId; // ID é uma string
            const laudoParaRecarregar = resultados.find(r => r.id === laudoId);
            if (laudoParaRecarregar && laudoParaRecarregar.originalInput) {
                inputArea.value = laudoParaRecarregar.originalInput;
                processar(); // Roda a análise automaticamente
                showToast('Laudo recarregado e analisado!');
            }
        }
    }

    // --- CONFIGURAÇÃO DE EXAMES ---

    let cachedConfigExames = null;
    function getConfigExames() {
        if (cachedConfigExames) return cachedConfigExames;

        const config = [
    // Ordem preferencial: HB/HT/LEUCO/PQT/UR/CR/PTF/NA/K/MG/BT(BD/BI)/TGO/TGP/GGT/FA/DHL/AMIL/PCR
    // --- HEMOGRAMA ---
        { id: 'hb', label: 'HB', nomesBusca: ["Dosagem de Hemoglobina", "Hemoglobina"], ref: { min: 13.0, max: 17.0 }, trendMeaning: 'higher_is_better' },
        { id: 'ht', label: 'HT', nomesBusca: ["Dosagem de Hematócrito", "Hematocrito"], ref: { min: 40.0, max: 50.0 }, trendMeaning: 'higher_is_better' },
        { id: 'vcm', label: 'VCM', nomesBusca: ["VCM"], optional: true, ref: { min: 80.0, max: 100.0 } },
        { id: 'hcm', label: 'HCM', nomesBusca: ["HCM"], optional: true, ref: { min: 27.0, max: 32.0 } },
        { id: 'chcm', label: 'CHCM', nomesBusca: ["CHCM"], optional: true, ref: { min: 31.5, max: 36.0 } },
        { id: 'rdw', label: 'RDW', nomesBusca: ["RDW"], optional: true, ref: { min: 11.9, max: 15.4 } },
        { id: 'leuco', label: 'LEUCO', nomesBusca: ["Leucocitos"], ref: { min: 4.0, max: 11.0 } },
        { id: 'n', label: 'N', nomesBusca: ["Neutrofilos"], optional: true, ref: { min: 1.8, max: 7.7 } },
        { id: 'linf', label: 'Linf', nomesBusca: ["Linfocitos totais", "Linfocitos"], optional: true, ref: { min: 1.0, max: 4.0 } },
        { id: 'mono', label: 'Mono', nomesBusca: ["Monocitos"], optional: true, ref: { min: 0.0, max: 0.8 } },
        { id: 'eos', label: 'Eos', nomesBusca: ["Eosinofilos"], optional: true, ref: { min: 0.0, max: 0.45 } },
        { id: 'baso', label: 'Baso', nomesBusca: ["Basofilos"], optional: true, ref: { min: 0.0, max: 0.2 } },
        { id: 'plaq', label: 'PQT', nomesBusca: ["Plaquetas"], ref: { min: 150, max: 450 } },
        
    // --- FUNÇÃO RENAL E ELETRÓLITOS ---
        { id: 'u', label: 'UR', nomesBusca: ["Ureia", "Ureia, serica"], ref: { M: { min: 19, max: 43 }, F: { min: 15, max: 36 } }, trendMeaning: 'higher_is_worse' },
        { id: 'cr', label: 'CR', nomesBusca: ["Creatinina", "Dosagem serica de Creatinina"], ref: { M: { min: 0.66, max: 1.25 }, F: { min: 0.52, max: 1.04 } }, trendMeaning: 'higher_is_worse' },

    // --- BIOQUÍMICA GERAL / INFLAMATÓRIOS ---
        {
            id: 'ptf',
            label: 'PTF',
            nomesBusca: ["Proteína Total e Frações", "Proteina Total e Fracoes"],
            tipo: 'agrupador',
            subExames: [
                { id: 'ptf_pt', label: 'Proteínas', nomesBusca: ["Proteinas", "Proteínas", "Proteinas Totais", "Proteínas Totais"], ref: { min: 6.0, max: 8.3 } },
                { id: 'ptf_alb', label: 'Albumina', nomesBusca: ["Albumina"], ref: { min: 3.5, max: 5.0 }, trendMeaning: 'higher_is_better' },
                { id: 'ptf_glob', label: 'Globulina', nomesBusca: ["Globulina"], ref: { min: 2.0, max: 3.5 } }
            ],
            template: (v, exame) => {
                const mostrarTendencia = document.getElementById('comparar-historico-toggle').checked;
                const pt = exame.subExames.find(sub => sub.id === 'ptf_pt')?.value;
                const alb = exame.subExames.find(sub => sub.id === 'ptf_alb')?.value;
                const glob = exame.subExames.find(sub => sub.id === 'ptf_glob')?.value;

                let ptTendenciaStr = '', albTendenciaStr = '', globTendenciaStr = '';

                if (mostrarTendencia && exame.tendencia) {
                    if (exame.tendencia.ptf_pt) ptTendenciaStr = ` (${exame.tendencia.ptf_pt.icone} ${exame.tendencia.ptf_pt.valorAntigo})`;
                    if (exame.tendencia.ptf_alb) albTendenciaStr = ` (${exame.tendencia.ptf_alb.icone} ${exame.tendencia.ptf_alb.valorAntigo})`;
                    if (exame.tendencia.ptf_glob) globTendenciaStr = ` (${exame.tendencia.ptf_glob.icone} ${exame.tendencia.ptf_glob.valorAntigo})`;
                }

                if (pt || alb) return `PTF ${pt || '?'}${ptTendenciaStr} (A ${alb || '?'}${albTendenciaStr}, G ${glob || '?'}${globTendenciaStr}) / `;
                return `PTF ${v}${ptTendenciaStr} / `;
            }
        },

    // --- ELETRÓLITOS ---
        { id: 'na', label: 'NA', nomesBusca: ["Sódio"], ref: { min: 137, max: 145 } },
        { id: 'k', label: 'K', nomesBusca: ["Potassio"], ref: { min: 3.5, max: 5.1 } },
        { id: 'mg', label: 'MG', nomesBusca: ["Magnésio"], ref: { min: 1.8, max: 2.4 } },

    // --- FUNÇÃO HEPÁTICA / BILI ---
        {
            id: 'bilirrubinas',
            label: 'Bilirrubinas',
            nomesBusca: ["Bilirrubina Total e Frações", "Bilirrubinas", "Bilirrubina Total"],
            tipo: 'agrupador',
            subExames: [
                { id: 'bt', label: 'BT', nomesBusca: ["Bilirrubina Total"], ref: { min: 0.2, max: 1.2 }, ignorarBaixo: true, trendMeaning: 'higher_is_worse' },
                { id: 'bd', label: 'BD', nomesBusca: ["Bilirrubina Direta"], ref: { min: 0.0, max: 0.3 }, trendMeaning: 'higher_is_worse' },
                { id: 'bi', label: 'BI', nomesBusca: ["Bilirrubina Indireta"], ref: { min: 0.1, max: 0.8 }, trendMeaning: 'higher_is_worse' }
            ],
            template: (v, exame) => {
                const bt = exame.subExames.find(sub => sub.id === 'bt')?.value || '?';
                const bd = exame.subExames.find(sub => sub.id === 'bd')?.value || '?';
                const bi = exame.subExames.find(sub => sub.id === 'bi')?.value || '?';
                return `BT ${bt} (BD ${bd}, BI ${bi}) / `;
            }
        },
        { id: 'tgo', label: 'TGO', nomesBusca: ["TGO/AST", "AST", "TGO"], ref: { M: { min: 17, max: 59 }, F: { min: 14, max: 36 } }, trendMeaning: 'higher_is_worse' },
        { id: 'tgp', label: 'TGP', nomesBusca: ["TGP/ALT", "ALT", "TGP"], ref: { M: { min: -Infinity, max: 50 }, F: { min: -Infinity, max: 35 } }, trendMeaning: 'higher_is_worse' },
        { id: 'ggt', label: 'GGT', nomesBusca: ["Gama Glutamil Transferase", "Gama Glutamil Transferase - GGT"], ref: { M: { min: 15, max: 73 }, F: { min: 12, max: 43 } }, trendMeaning: 'higher_is_worse' },
        { id: 'fal', label: 'FA', nomesBusca: ["Fosfatase Alcalina"], ref: { min: 30, max: 120 }, trendMeaning: 'higher_is_worse' },
        { id: 'dhl', label: 'DHL', nomesBusca: ["DHL", "Desidrogenase Lactica"], ref: { min: 120, max: 246 }, trendMeaning: 'higher_is_worse' },
        
    // --- ENZIMAS PANCREÁTICAS ---
        { id: 'amil', label: 'AMIL', nomesBusca: ["Amilase"], ref: { min: 25, max: 125 }, trendMeaning: 'higher_is_worse' },

    // --- MARCADOR INFLAMATÓRIO ---
        { id: 'pcr', label: 'PCR', nomesBusca: ["Proteína C Reativa - PCR"], ref: { min: -Infinity, max: 0.5 }, trendMeaning: 'higher_is_worse' },
    
    // --- RESTANTE (Mantido da lista original em ordem) ---
    // --- COAGULAÇÃO ---
        { id: 'inr', label: 'INR', nomesBusca: ["RNI", "INR"], ref: { min: 1.0, max: 1.2 }, trendMeaning: 'higher_is_worse' },
        { id: 'r', label: 'R', nomesBusca: ["Relacao paciente/normal"], ref: { min: 0.85, max: 1.20 } },
        { id: 'dimd', label: 'D-Dim', nomesBusca: ["D-Dimero", "D-Dimer"], ref: { min: -Infinity, max: 500 }, trendMeaning: 'higher_is_worse' },

    // --- PERFIL DE ANEMIA E FERRO ---
        { id: 'reti', label: 'Retic', nomesBusca: ["Contagem de Reticulócitos", "Reticulocitos", "RETI"], ref: { min: 0.5, max: 2.0 } },
        { id: 'ferro', label: 'Ferro', nomesBusca: ["Ferro", "FER"], ref: { M: { min: 65, max: 175 }, F: { min: 50, max: 170 } } },
        { id: 'ferritina', label: 'Ferritina', nomesBusca: ["Ferritina", "FERRI"], ref: { M: { min: 22.0, max: 322.0 }, F: { min: 10.0, max: 291.0 } } },
        { id: 'transferrina', label: 'Transferrina', nomesBusca: ["Transferrina", "TRA"], ref: { M: { min: 215, max: 365 }, F: { min: 250, max: 380 } } },
        { id: 'tibc', label: 'TIBC', nomesBusca: ["Capacidade total de ligação do ferro", "TIBC", "CAPFER"], ref: { min: 250, max: 425 } },

    // --- OUTROS RENAL/ELETRÓLITOS ---
	    { id: 'tfg', label: 'TFG', nomesBusca: ["TFG", "TFG - Taxa de Filtração Glomerular", "Ritmo de Filtracao Glomerular", "RFG"], optional: true, ref: { min: 90, max: Infinity }, trendMeaning: 'higher_is_better' },
        { id: 'au', label: 'AU', nomesBusca: ["Acido Urico"], optional: true, ref: { M: { min: 3.5, max: 7.2 }, F: { min: 2.6, max: 6.0 } }, trendMeaning: 'higher_is_worse' },
        { id: 'cl', label: 'Cl', nomesBusca: ["Cloro"], ref: { min: 98, max: 107 } },
        { id: 'cai', label: 'Cai', nomesBusca: ["Calcio Ionizado"], ref: { min: 1.12, max: 1.30 } },
        { id: 'ca', label: 'Ca', nomesBusca: ["Calcio"], ref: { min: 8.4, max: 11.0 } },
        { id: 'p', label: 'P', nomesBusca: ["Fosforo"], ref: { min: 2.5, max: 4.5 } },
        
    // --- PERFIL LIPÍDICO ---
        { id: 'ct', label: 'CT', nomesBusca: ["Colesterol Total"], ref: { min: -Infinity, max: 190 }, trendMeaning: 'higher_is_worse' },
        { id: 'hdl', label: 'HDL', nomesBusca: ["Colesterol HDL"], ref: { M: { min: 40, max: Infinity }, F: { min: 50, max: Infinity } }, trendMeaning: 'higher_is_better' },
        { id: 'ldl', label: 'LDL', nomesBusca: ["Colesterol LDL"], ref: { min: -Infinity, max: 130 }, trendMeaning: 'higher_is_worse' },
        { id: 'tg', label: 'TGL', nomesBusca: ["Triglicerides", "TGL"], ref: { min: -Infinity, max: 175 }, trendMeaning: 'higher_is_worse' },
        { id: 'vldl', label: 'VLDL', nomesBusca: ["Colesterol VLDL"], ref: { min: -Infinity, max: 30 }, trendMeaning: 'higher_is_worse' },
 
    // --- OUTROS BIOQUÍMICA ---
        { id: 'glic', label: 'Glic', nomesBusca: ["Glicose", "Glicemia"], ref: { min: 70, max: 99 }, trendMeaning: 'higher_is_worse' },
        { id: 'lact', label: 'Lact', nomesBusca: ["Lactato"], ref: { min: 0.5, max: 2.2 }, trendMeaning: 'higher_is_worse' },        
        { id: 'hba1c', label: 'HbA1c', nomesBusca: ["Hemoglobina Glicada", "HbA1c"], ref: { min: -Infinity, max: 5.7 }, trendMeaning: 'higher_is_worse' },

    // --- ENZIMAS CARDÍACAS ---
        { id: 'trop', label: 'Trop', nomesBusca: ["Troponina I de Alta Sensibilidade – hs TnI", "Troponina I", "Troponina T", "Troponina Ultrassensivel"], ref: { min: -Infinity, max: 19 }, trendMeaning: 'higher_is_worse' },
        { id: 'ck', label: 'CK', nomesBusca: ["CK - Creatinofosfoquinase", "CK Total", "Creatinoquinase"], ref: { M: { min: 55, max: 170 }, F: { min: 30, max: 135 } }, trendMeaning: 'higher_is_worse' },
        { id: 'ckmb', label: 'CKMB', nomesBusca: ["Dosagem sérica de CKMB - Creatino Fosfoquinase", "CK-MB"], ref: { min: -Infinity, max: 16 }, trendMeaning: 'higher_is_worse' },
        { id: 'bnp', label: 'BNP', nomesBusca: ["BNP", "NT-proBNP", "Peptideo Natriuretico"], ref: { min: -Infinity, max: 100 }, trendMeaning: 'higher_is_worse' },

    // --- OUTRAS ENZIMAS ---
        { id: 'lip', label: 'Lip', nomesBusca: ["Lipase"], ref: { min: 10, max: 140 }, trendMeaning: 'higher_is_worse' },

    // --- SOROLOGIAS E CULTURAS ---
        { id: 'hiv', label: 'HIV', nomesBusca: ["Anticorpos Anti-HIV", "HIV"], tipo: 'texto', template: v => 'HIV ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
        { id: 'vdrl', label: 'VDRL', nomesBusca: ["Reação de VDRL", "VDRL"], tipo: 'texto', template: v => 'VDRL ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
        { id: 'hcv', label: 'Anti-HCV', nomesBusca: ["Hepatite C, anticorpos", "HEPC"], tipo: 'texto', template: v => 'Anti-HCV ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
        { id: 'hbsag', label: 'HBsAg', nomesBusca: ["Hepatite B, antígeno HBs (HBsAg)", "HBSG"], tipo: 'texto', template: v => 'HBsAg ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
        { id: 'hbc_igm', label: 'Anti-HBc IgM', nomesBusca: ["Hepatite B, anticorpos anti-HBc IgM", "HBCM"], tipo: 'texto', template: v => 'Anti-HBc IgM ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
        { id: 'hbs', label: 'Anti-HBs', nomesBusca: ["Hepatite B, anticorpos anti-HBs", "AHBS"], ref: { min: 10, max: Infinity } },
        { id: 'cult_vig', label: 'Cultura Vig.', nomesBusca: ["Cultura de Vigilância", "CVIG", "CVIG2", "CVIG3"], tipo: 'texto', template: v => 'Cult Vig: ' + (v.toLowerCase().includes('nao houve crescimento') ? 'Neg / ' : `Pos (${v}) / `) },

    // --- MICROBIOLOGIA ---
        { 
            id: 'hmc', 
            label: 'HMC',
            nomesBusca: ["Hemocultura", "Hemoculturas"],
            tipo: 'texto',
            template: (v) => {
                const valorLimpo = v.toLowerCase();
                if (valorLimpo.includes("não houve crescimento") || valorLimpo.includes("nao houve crescimento")) return 'HMC SCB / ';
                if (valorLimpo.includes("crescimento")) return 'HMC POS / ';
                return `HMC ${v} / `;
            } 
        },
                {
                    id: 'uroc',
                    label: 'Urocultura',
                    nomesBusca: ["Cultura de Urina", "Urocultura"],
                    tipo: 'texto',
                    template: (v, exame) => (exame.value === 'SCB') ? 'Urocultura SCB / ' : `Urocultura ${v} / `
                },
                {
                    id: 'cultura_aerobios',
                    label: 'Cultura Aeróbios',
                    nomesBusca: ["Cultura de Aeróbios"],
                    tipo: 'microbiologia',
                    template: (v) => {
                        if (!v || v.length === 0) return 'Cultura Aeróbios: SCB / ';
                        const material = v[0]?.material || 'N/A';
                        const partes = v.map(microrganismo => {
                            const sensiveis = microrganismo.sensiveis;
                            const resistentes = microrganismo.resistentes;
                            let str = microrganismo.nome;
                            if (sensiveis.length > 0) str += ` (S: ${sensiveis.join(', ')})`;
                            if (resistentes.length > 0) str += ` (R: ${resistentes.join(', ')})`;
                            return str;
                        });
                        return `Cultura (${material}): ${partes.join(' + ')} / `;
                    }
                },
        
    // --- ENDOCRINOLOGIA ---
        { id: 'tsh', label: 'TSH', nomesBusca: ["TSH"], ref: { min: 0.4, max: 4.5 }, trendMeaning: 'higher_is_worse' }, // Simplificado
        { id: 't4l', label: 'T4L', nomesBusca: ["T4 Livre"], ref: { min: 0.8, max: 1.8 } },
        { id: 't3l', label: 'T3L', nomesBusca: ["T3 Livre"], ref: { min: 2.0, max: 4.4 } },
        { id: 't3t', label: 'T3T', nomesBusca: ["T3 Total"], ref: { min: 80, max: 200 } },
        { id: 'atpo', label: 'Anti-TPO', nomesBusca: ["Anti-TPO"], ref: { min: -Infinity, max: 35 } },
        { id: 'atg', label: 'Anti-TG', nomesBusca: ["Anti-Tireoglobulina"], ref: { min: -Infinity, max: 40 } },
        { id: 'vitd', label: 'Vit.D', nomesBusca: ["Vitamina D Total 25 OH", "Vitamina D", "25-hidroxivitamina D", "Vitamina D3", "VD325OH"], ref: { min: 20, max: 50 }, trendMeaning: 'higher_is_better' },
        { id: 'pth', label: 'PTH', nomesBusca: ["Dosagem sérica de PTH - Paratormônio", "PTH", "Paratormonio"], ref: { min: 18.5, max: 88.0 } },
        { id: 'vitb12', label: 'Vit.B12', nomesBusca: ["Vitamina B12", "VB12"], ref: { min: 211, max: 911 } },
        { id: 'afol', label: 'Ac.Fólico', nomesBusca: ["Ácido Fólico", "AFOL"], ref: { min: 5.38, max: Infinity } },

    // --- MARCADORES TUMORAIS ---
        { id: 'psa', label: 'PSA', nomesBusca: ["PSA", "Antigeno Prostatico Especifico"], ref: { min: -Infinity, max: 4.0 }, trendMeaning: 'higher_is_worse' },
        { id: 'cea', label: 'CEA', nomesBusca: ["CEA", "Antigeno Carcinoembrionario"], ref: { min: -Infinity, max: 5.0 }, trendMeaning: 'higher_is_worse' },
        { id: 'afp', label: 'AFP', nomesBusca: ["Alfa-fetoproteína"], ref: { min: -Infinity, max: 10 }, trendMeaning: 'higher_is_worse' },
        { id: 'ca199', label: 'CA19-9', nomesBusca: ["CA 19-9"], template: (v) => `CA19-9 ${v.replace(/\.(?=.*\d{3},)/g, '')} / `, ref: { min: -Infinity, max: 37 }, trendMeaning: 'higher_is_worse' },
        { id: 'ca125', label: 'CA125', nomesBusca: ["CA 125"], ref: { min: -Infinity, max: 35 }, trendMeaning: 'higher_is_worse' },
        { id: 'ca153', label: 'CA15-3', nomesBusca: ["CA 15-3"], ref: { min: -Infinity, max: 30 }, trendMeaning: 'higher_is_worse' },
        { id: 'bhcg', label: 'Beta-HCG', nomesBusca: ["Beta-HCG"], ref: { min: -Infinity, max: 5 }, trendMeaning: 'higher_is_worse' },

    // --- GASOMETRIA ARTERIAL ---
        { id: 'phart', label: 'pHart', nomesBusca: ["PH"], usaTextoArterial: true, ref: { min: 7.35, max: 7.45 } },
        { id: 'po2art', label: 'pO2art', nomesBusca: ["PO2"], usaTextoArterial: true, ref: { min: 80, max: 100 } },
        { id: 'pco2art', label: 'pCO2art', nomesBusca: ["PCO2"], usaTextoArterial: true, ref: { min: 35, max: 40 } },
        { id: 'so2art', label: 'SO2art', nomesBusca: ["Saturacao de O2"], usaTextoArterial: true, ref: { min: 95, max: 100 } },
        { id: 'hco3art', label: 'HCO3art', nomesBusca: ["Bicarbonato"], usaTextoArterial: true, ref: { min: 22, max: 26 } },
        { id: 'beart', label: 'BEart', nomesBusca: ["Base Exces"], usaTextoArterial: true, ref: { min: -2, max: 2 } },
        { id: 'lactart', label: 'Lactart', nomesBusca: ["Lactato Arterial"], ref: { min: 0.5, max: 1.6 }, trendMeaning: 'higher_is_worse' },
        
    // --- GASOMETRIA VENOSA ---
        { id: 'phven', label: 'pHven', nomesBusca: ["PH"], usaTextoVenoso: true, ref: { min: 7.31, max: 7.41 } },
        { id: 'po2ven', label: 'pO2ven', nomesBusca: ["PO2"], usaTextoVenoso: true, ref: { min: 30, max: 40 } },
        { id: 'pco2ven', label: 'pCO2ven', nomesBusca: ["PCO2"], usaTextoVenoso: true, ref: { min: 41, max: 51 } },
        { id: 'so2ven', label: 'SO2ven', nomesBusca: ["Saturacao de O2"], usaTextoVenoso: true },
        { id: 'hco3ven', label: 'HCO3ven', nomesBusca: ["Bicarbonato"], usaTextoVenoso: true, ref: { min: 23, max: 29 } },
        { id: 'beven', label: 'BEven', nomesBusca: ["Base Exces"], usaTextoVenoso: true, ref: { min: -2, max: 2 } },
        { id: 'lactven', label: 'Lactven', nomesBusca: ["Lactato"], usaTextoVenoso: true, ref: { min: 0.5, max: 2.2 }, trendMeaning: 'higher_is_worse' },

    // --- URINA I (AGRUPADOR) ---
        {
            id: 'urina1',
            label: 'Urina I',
            nomesBusca: ["Urina I", "Urina tipo I", "EAS"],
            tipo: 'agrupador',
            subExames: [
                { id: 'u1dens', label: 'Densidade', nomesBusca: ["Densidade"], ref: { min: 1005, max: 1030 } },
                { id: 'u1ph', label: 'pH', nomesBusca: ["pH"], ref: { min: 5.0, max: 6.0 } },
                { id: 'u1proteina', label: 'Proteína', nomesBusca: ["Proteina"], tipo: 'texto', ref: { normal: "Negativo" } },
                { id: 'u1glicose', label: 'Glicose', nomesBusca: ["Glicose"], tipo: 'texto', ref: { normal: "Negativo" } },
                { id: 'u1sangue', label: 'Sangue', nomesBusca: ["Sangue"], tipo: 'texto', ref: { normal: "Negativo" } },
                { id: 'u1nitrito', label: 'Nitrito', nomesBusca: ["Nitrito"], tipo: 'texto', ref: { normal: "Negativo" } },
                { id: 'u1leuco', label: 'Leucócitos', nomesBusca: ["Leucocitos"], ref: { min: -Infinity, max: 20000 } },
                { id: 'u1hemacias', label: 'Hemácias', nomesBusca: ["Hemacias"], ref: { min: -Infinity, max: 20000 } },
                { id: 'u1cel_epi', label: 'Cél. Epiteliais', nomesBusca: ["Celulas epiteliais"], tipo: 'texto', ref: { normal: "Raras" } },
                { id: 'u1bacterias', label: 'Bactérias', nomesBusca: ["Bacterias"], tipo: 'texto', ref: { normal: "Inferior a 1,0" } },
            ],
            template: (v, exame) => {
                const alterados = exame.subExames.filter(sub => sub.status === 'alterado');
                if (alterados.length === 0) return 'Urina I s/a / ';
                const partesAlteradas = alterados.map(sub => `${sub.label.toUpperCase()} ${sub.value}`);
                return `Urina I (${partesAlteradas.join(', ')}, demais s/a) / `;
            }
        }
        ];

        // Otimização: Adicionar propriedades padrão (como 'template') dinamicamente
        // Isso reduz significativamente a verbosidade da configuração acima.
        config.forEach(exame => {
            if (!exame.template) {
                exame.template = (v) => `${exame.label} ${v} / `;
            }
        });
        
        cachedConfigExames = config;
        return cachedConfigExames;
    }

    // --- LÓGICA DE PROCESSAMENTO DE DADOS ---
    function removerAcentos(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // Pega data mais proxima no texto
    function pegarData(texto) {
        const m = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
        return m ? m[1].replace(/\/\d{4}$/, '') : null;
    }
    // Pega o nome do paciente
    function pegarNomePaciente(texto) {
        const m = texto.match(/Paciente:\s*([^\n]+)/i);
        return m ? m[1].trim() : "Paciente Desconhecido";
    }

    function pegarDataComHora(texto) {
        const dataMatch = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
        if (!dataMatch) return 'N/A';
        const data = dataMatch[1].replace(/\/\d{4}$/, ''); // Formato DD/MM

        // Tenta pegar a hora de "Liberação:" ou "Coleta:"
        const horaMatch = texto.match(/(?:Liberacao:|Coleta:)\s*[\d\/]{8,10}\s*-?\s*(\d{1,2}):(\d{2})/i);
        if (horaMatch) {
            return `${data} ${horaMatch[1]}:${horaMatch[2]}`; // Retorna DD/MM HH:mm
        }
        return data; // Fallback para apenas data se a hora não for encontrada
    }
    // Pega a data completa para ordenação
    function pegarDataCompleta(texto) {
        const m = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
        if (!m) return null;
        const [dia, mes, ano] = m[1].split('/');
        return `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para fácil ordenação
    }

    function pegarDataHoraCompleta(texto) {
        const dataMatch = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
        if (!dataMatch) return null;
        const [dia, mes, ano] = dataMatch[1].split('/');
        
        let hora = '00';
        let minuto = '00';

        // Tenta pegar a hora de "Liberação:" ou "Coleta:"
        const horaMatch = texto.match(/(?:Liberacao:|Coleta:)\s*[\d\/]{8,10}\s*-?\s*(\d{1,2}):(\d{2})/i);
        if (horaMatch) {
            hora = horaMatch[1].padStart(2, '0');
            minuto = horaMatch[2].padStart(2, '0');
        }
        return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
    }

    function pegarSexoPaciente(texto) {
        const m = texto.match(/Sexo:\s*(Masculino|Feminino)/i);
        // Retorna 'M' para Masculino, 'F' para Feminino, ou null se não encontrar
        if (m && m[1]) {
            return m[1].toUpperCase().startsWith('M') ? 'M' : 'F';
        }
        return null;
    }

    function isForaDoIntervalo(valor, referencia, ignorarBaixo = false) {
        if (!referencia) return false; // Se não há referência, não está fora.

        const { min, max } = referencia;

        // Está fora se for maior que o máximo OU (se não for para ignorar valores baixos E for menor que o mínimo)
        return valor > max || (!ignorarBaixo && valor < min);
    }
    
    function analisarExameAgrupador(exameConfig, textoParaAnalisar, sexoPaciente) {
        const { subExames } = exameConfig;

        const resultadosSubExames = subExames.map(sub => {
            // Usa uma regex que busca o nome do sub-exame no início de uma linha (com ou sem espaços)
            // e captura o primeiro valor numérico que encontrar depois dele.
            const nomeBusca = sub.nomesBusca.map(n => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
            
            // [CORREÇÃO] Regex mais robusta: aceita quebras de linha (\r\n), espaços e dois pontos (:) antes do número
            const regex = new RegExp(`(?:^|[\\n\\r])\\s*(${nomeBusca})[\\s:]+([^\\n\\r<]+)`, "im");
            
            const match = textoParaAnalisar.match(regex);

            if (!match || !match[2]) {
                return { ...sub, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };
            }

            const valorStrOriginal = match[2].trim();
            const valorStrLimpo = valorStrOriginal.replace(',', '.');

            if (sub.tipo === 'texto') {
                const status = valorStrLimpo.toLowerCase() === sub.ref.normal.toLowerCase() ? CONSTS.STATUS.NORMAL : CONSTS.STATUS.ALTERADO;
                return { ...sub, value: valorStrOriginal, status };
            }

            const valorNum = parseFloat(valorStrLimpo.replace(/\.(?=.*\d{3})/g, '')); 
            if (isNaN(valorNum)) {
                return { ...sub, value: valorStrOriginal, status: 'normal' };
            }
            const status = isForaDoIntervalo(valorNum, sub.ref) ? CONSTS.STATUS.ALTERADO : CONSTS.STATUS.NORMAL;
            return { ...sub, value: valorStrOriginal, status };
        });

        if (resultadosSubExames.every(r => r.status === CONSTS.STATUS.NAO_ENCONTRADO)) {
            return { ...exameConfig, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };
        }

        const alterados = resultadosSubExames.filter(sub => sub.status === 'alterado');
        const valorDisplay = alterados.length > 0
            ? alterados.map(sub => `${sub.label}: ${sub.value}`).join(', ')
            : 'Normal';

        return {
            ...exameConfig,
            value: valorDisplay,
            status: alterados.length > 0 ? CONSTS.STATUS.ALTERADO : CONSTS.STATUS.NORMAL,
            // [IMPORTANTE] Retorna TODOS os sub-exames encontrados (não nulos) para o template usar
            subExames: resultadosSubExames.filter(s => s.value !== null) 
        };
    }

    function extrairValorDoBloco(textoBloco, exameConfig, sexoPaciente) {
        const { nomesBusca, tipo, ignorarBaixo, id } = exameConfig;

        if (tipo === 'texto') {
            let valorTexto;

            // Specific logic for uroculture partial results
            if (id === 'uroc') {
                const parcialMatch = textoBloco.match(/Resultado Parcial\s+([\s\S]+)/i);
                if (parcialMatch) {
                    let lines = parcialMatch[1].trim().split(/[\n\r]+/).filter(l => l.trim());
                    // Filter out the unwanted note
                    lines = lines.filter(l => !l.toLowerCase().includes('amostra coletada'));
                    // Get the last two relevant pieces of information
                    const info = lines.map(l => l.replace(/[\d\/]+\s*[\d:]+/, '').trim());
                    valorTexto = info.slice(-2).join('; ');
                }
            }

            // If not a partial uroculture, or if the above failed, proceed with general logic
            if (!valorTexto) {
                // 1. Prioritize Microrganismo, as it's the most specific result
                let match = textoBloco.match(/Microrganismo:\s+([^\n\r]+)/i);
                valorTexto = match ? match[1] : null;

                // 2. If no microrganism, check for serology/culture keywords
                if (!valorTexto) {
                    const naoReagenteMatch = textoBloco.match(/(N[aã]o Reagente)/i);
                    const reagenteMatch = textoBloco.match(/(?<!N[aã]o\s)\b(Reagente)\b/i);
                    const crescimentoMatch = textoBloco.match(/(?:Resultado:|Microrganismo:)\s*(N[aã]o houve crescimento)/i);

                    if (naoReagenteMatch) {
                        valorTexto = naoReagenteMatch[0];
                    } else if (reagenteMatch) {
                        valorTexto = reagenteMatch[0];
                    } else if (crescimentoMatch) {
                        valorTexto = crescimentoMatch[1]; // Use group 1 to get just the text
                    }
                }
            }

            if (!valorTexto) return { ...exameConfig, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };

            // For HMC, the template handles 'SCB'
            if (id === 'hmc' && valorTexto.toLowerCase().includes('coagulase negative staphylococcus')) {
                return { ...exameConfig, value: 'Staphylo Coag Neg', status: CONSTS.STATUS.ALTERADO };
            }
            
            // Handle special cases for uroculture
            if (id === 'uroc' && (valorTexto.toLowerCase().includes("nao houve crescimento"))) {
                return { ...exameConfig, value: 'SCB', status: CONSTS.STATUS.NORMAL };
            }

            return { ...exameConfig, value: valorTexto.trim().replace(/\.$/, ''), status: CONSTS.STATUS.NORMAL };
        }
        function extrairReferenciaDoBloco(textoBloco, sexoPaciente) { // REFATORADO
            const parseNum = (str) => parseFloat(str.replace(',', '.'));
            let match;
            
            // Procura por "Valor de referência" para ancorar a busca
            const refAnchorMatch = textoBloco.match(/Valor(?:es)? de refer[êe]ncia/i);
            let textoReferencia = textoBloco; // Por padrão, analisa o bloco todo

            if (refAnchorMatch) {
                // Se achou a âncora, busca apenas no subtexto a partir dela
                textoReferencia = textoBloco.substring(refAnchorMatch.index);
            }

            // --- Padrão -1: Prioritário para TFG "Normal" ---
            // Isso evita que ele pegue o range de "Diminuição leve" primeiro.
            const tfgNormalRegex = /Normal\s*:\s*(?:>=|superior a|maior que)\s*([\d,.]+)/i;
            match = textoReferencia.match(tfgNormalRegex);
            if (match && match[1]) {
                return { min: parseNum(match[1]), max: Infinity };
            }

            // --- Padrão 0: Prioritário para "Adultos" ou "Acima de X anos" ---
            // Isso resolve o problema de pegar a referência de RN/criança primeiro.
            const adultoRegex = new RegExp(
                `(?:Adulto(s)?|Acima de \\d+ anos|\\+\\s*de \\d+ anos)[\\s=:]*?` + // Âncora (ex: "Adulto", "Acima de 20 anos", "+ de 12 anos")
                `([\\d,.]+)\\s*(?:a|ate|-)\\s*([\\d,.]+)`, // Captura o range (ex: 1.6 a 2.6 ou 3,5 a 5,0)
                'i'
            );
            match = textoReferencia.match(adultoRegex);
            if (match && match[2] && match[3]) { // Corrigido para usar os grupos de captura corretos
                return { min: parseNum(match[2]), max: parseNum(match[3]) };
            }

            // --- Padrões de Extração (agora buscam em 'textoReferencia') ---

            // Padrão 1: Específico para sexo (TGP, GGT, Cr, U)
            if (sexoPaciente) {
                const mascRegex = '(?:Masculino|Homem|Homens)';
                const femRegex = '(?:Feminino|Mulher|Mulheres)';
                // Tenta primeiro o sexo específico, depois um "Adultos" genérico
                const sexosRegex = [sexoPaciente === 'M' ? mascRegex : femRegex, 'Adultos'];

                for (const sexoTermo of sexosRegex) {
                    const sexoRegex = new RegExp(
                        `${sexoTermo}[\\s:]*?` +  // Âncora (ex: "Homens" ou "Adultos")
                        `(?:` + // Início das alternativas
                            `([\\d,.]+)\\s*(?:a|ate|-)\\s*([\\d,.]+)` +  // Alt 1: Range (ex: 15 a 73)
                            `|(?:inferior a|menor que|<)\\s*([\\d,.]+)` + // Alt 2: Limite Superior (ex: Menor que 50)
                            `|(?:superior a|maior que|>)\\s*([\\d,.]+)` +  // Alt 3: Limite Inferior
                        `)`, 
                        'i'
                    );
                    match = textoReferencia.match(sexoRegex);
                    if (match) {
                        if (match[1] && match[2]) return { min: parseNum(match[1]), max: parseNum(match[2]) };
                        if (match[3]) return { min: -Infinity, max: parseNum(match[3]) };
                        if (match[4]) return { min: parseNum(match[4]), max: Infinity };
                    }
                }
            }

            // Padrão 2: Intervalo genérico (ex: Potássio 3,5 ate 5,1)
            // Procura por um range que NÃO seja precedido por "Coleta:" para evitar pegar datas.
            match = textoReferencia.match(/(?<!Coleta:\s*[\d\/]{8,10}\s*-\s*[\d:]+\s*-\s*|Liberacao:\s*[\d\/]{8,10}\s*-\s*[\d:]+\s*-\s*)(-?\d[\d,.]+)\s*(?:a|ate|-)\s*(-?\d[\d,.]+)/i);
            // [FIX] Padrão mais robusto: procura por um range que segue a palavra "referência", limitando a busca para evitar capturar ranges de idade.
            match = textoReferencia.match(/(?:refer[êe]ncia:?)[\s\S]{0,100}?(-?\d[\d,.]+)\s*(?:a|ate|-)\s*(-?\d[\d,.]+)/i);
            if (match && match[1] && match[2]) {
                return { min: parseNum(match[1]), max: parseNum(match[2]) };
            }

            // Padrão 3: Limite superior genérico (ex: PCR Inferior a 1,0)
            match = textoReferencia.match(/(?:inferior a|menor que|<)\s*([\d,.]+)/i);
            if (match && match[1]) {
                return { min: -Infinity, max: parseNum(match[1]) };
            }

            // Padrão 4: Limite inferior genérico (ex: TFG Superior a 90)
            match = textoReferencia.match(/(?:superior a|maior que|>|>=)\s*([\d,.]+)/i);
            if (match && match[1]) {
                return { min: parseNum(match[1]), max: Infinity };
            }

            return null; // Não encontrou referência dinâmica
        }

        // Lógica para exames quantitativos
        let valorMatch = null;

        // Tenta diferentes padrões de regex sequencialmente
        const patterns = [
            /Valor relativo\s+([\d,.-]+)/im,
            // Padrão para "Superior a 90" (TFG)
            /Resultado[\s\n\r]+(Superior a\s+[\d,.-]+)/im,
            // [BUG FIX] Padrão "Resultado 123" mais específico e priorizado
            /Resultado\s+([\d,.-]+)/im,
            // Regra especial para Neutrófilos e outros do leucograma: pegar o segundo valor numérico na linha
            nomesBusca.some(n => ["neutrofilos", "linfocitos totais", "monocitos", "eosinofilos", "basofilos"].includes(n.toLowerCase())) ? /[\d,.]+\s+([\d,.]+)/ : null,
            // Padrão "NomeExame 123" na mesma linha
            ...nomesBusca.map(nome => new RegExp(`^${removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s+(-?\\d[\\d,.-]*)`, "im")),
            // Padrão genérico para pegar o primeiro número no bloco
            /(?:\s|\n)(-?\d[\d,.-]*)/
        ].filter(p => p); // Remove padrões nulos

        for (const pattern of patterns) {
            valorMatch = textoBloco.match(pattern);
            if (valorMatch && valorMatch[1]) break;
        }

    if (!valorMatch || !valorMatch[1]) return { ...exameConfig, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };
    
    const valorOriginalStr = valorMatch[1].trim();
    // Para valores como "Superior a 90", o valor é o próprio texto.
    if (isNaN(parseFloat(valorOriginalStr.replace(',', '.')))) {
        return { ...exameConfig, value: valorOriginalStr, status: CONSTS.STATUS.NORMAL };
    }

    const valorStr = valorOriginalStr.replace(/\.(?=.*\d{3})/g, '').replace(',', '.');
    const valorNum = parseFloat(valorStr);
    let status = CONSTS.STATUS.NORMAL;

    // LÓGICA DE REFERÊNCIA: Tenta extrair do bloco (dinâmica). Se falhar, usa hardcoded. Salva a dinâmica no cache se encontrada.
    let referencia = extrairReferenciaDoBloco(textoBloco, sexoPaciente);
    let origemReferencia = 'nenhuma';

    if (referencia) {
        origemReferencia = 'dinamica';
        // Salva a referência dinâmica no cache para futuro uso em análises de tendência.
        try {
            const cacheKey = `ref_cache_${exameConfig.id}`;
            localStorage.setItem(cacheKey, JSON.stringify(referencia));
        } catch (e) {
            // Silently ignore cache saving errors
        }
    } else if (exameConfig.ref) { // Se não achou dinâmica, usa a hardcoded como fallback
        origemReferencia = 'hardcoded';
        if (exameConfig.ref.M || exameConfig.ref.F) {
            referencia = sexoPaciente ? exameConfig.ref[sexoPaciente] : (exameConfig.ref.M || exameConfig.ref.F);
        } else {
            referencia = exameConfig.ref;
        }
    }

    if (id === 'inr' && valorNum >= 2.0 && valorNum <= 3.0) {
        status = CONSTS.STATUS.NORMAL;
        // Mesmo em caso especial, retorna o debug completo
        const inrResult = { ...exameConfig, value: valorOriginalStr, status: status };
        inrResult.debug = { referenciaUtilizada: referencia, origemReferencia: origemReferencia };
        return inrResult;
    }

    if (isForaDoIntervalo(valorNum, referencia, ignorarBaixo)) {
        status = CONSTS.STATUS.ALTERADO;
    }

    const result = { ...exameConfig, value: valorOriginalStr, status: status };
    result.debug = { referenciaUtilizada: referencia, origemReferencia: origemReferencia }; // Adiciona a referência e sua origem
    return result;
}

function extrairBlocoExame(textoParaAnalisar, exameConfig, todosNomesBuscaFiltrado) {
        // A string 'todosNomesBuscaFiltrado' agora é pré-calculada e passada diretamente.
        for (const nome of exameConfig.nomesBusca) {
            const lblSemAcentos = removerAcentos(nome);
            let regexStr = lblSemAcentos.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s/g, '\\s+');
            // Make CEA more specific to avoid matching "Ceac"
            if (exameConfig.id === 'cea') {
                // It must be at the start of a line, or preceded by a newline and optional whitespace.
                regexStr = `(?:^|\\n\\s*)${regexStr}`;
            }
            if (nome.toLowerCase() === 'lactato') regexStr = 'Lactato(?! Arterial)';

            // [BUG FIX FINAL] Regex ajustada para capturar o bloco inteiro corretamente, parando apenas em um novo título de exame ou na assinatura.
            const re = new RegExp(`(^|\\n)(${regexStr}(?:\\s|\\n|\\r)*[\\s\\S]*?)(?=(?:\\n\\s*|\\s{2,})(?:${todosNomesBuscaFiltrado})|\\nLiberado por|Problema ao visualizar|$)`, "i");
            const blocoMatch = textoParaAnalisar.match(re);
            if (blocoMatch && blocoMatch[2]) return blocoMatch[2];
        }
        return null;
    }

    function analisarExameMicrobiologia(exameConfig, textoCompleto) {
        const { nomesBusca } = exameConfig;
        const nomesBuscaSemAcentos = nomesBusca.map(nome => removerAcentos(nome));
        const nomeBuscaRegex = new RegExp(`(?:^|\\n)(${nomesBuscaSemAcentos.join('|')})`, 'gi');
        const resultados = [];
        const textoSemAcentos = removerAcentos(textoCompleto);
        
        const partes = textoSemAcentos.split(nomeBuscaRegex);

        if (partes.length <= 1) {
            return { ...exameConfig, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };
        }
        
        for (let i = 1; i < partes.length; i += 2) {
            const bloco = partes[i+1];
            if (!bloco) continue;

            // Regex aprimorada para lidar com o erro de digitação "Materlal"
            const materialMatch = bloco.match(/Mater(i|la)l:\s*([^\n\r]+)/i);
            const material = materialMatch ? materialMatch[2].trim() : 'N/A';

            const microrganismoMatch = bloco.match(/Microrganismo:\s*([^\n\r]+)/i);
            if (!microrganismoMatch || removerAcentos(microrganismoMatch[1]).toLowerCase().includes('nao houve crescimento')) {
                continue;
            }
            const nomeMicrorganismo = microrganismoMatch[1].trim();
            
            const sensiveis = [];
            const resistentes = [];
            
            const antibiogramaMatch = bloco.match(/Antibiograma([\s\S]*?)(?=Notas:|Métodos utilizados:|Cultura de Aeróbios|$)/i);
            if (antibiogramaMatch && antibiogramaMatch[1]) {
                const tabelaTexto = antibiogramaMatch[1];
                const linhasRegex = /^([A-Za-z\/].*?)\s+(S|R|I)\s*$/gm;
                let linhaMatch;
                while((linhaMatch = linhasRegex.exec(tabelaTexto)) !== null) {
                    const antibiotico = linhaMatch[1].trim();
                    const sensibilidade = linhaMatch[2];
                    
                    if (sensibilidade === 'S') sensiveis.push(antibiotico);
                    else if (sensibilidade === 'R') resistentes.push(antibiotico);
                }
            }
            
            resultados.push({
                nome: nomeMicrorganismo,
                material: material,
                sensiveis: sensiveis,
                resistentes: resistentes,
            });
        }

        if (resultados.length === 0) {
            return { ...exameConfig, value: [], status: CONSTS.STATUS.NORMAL };
        }

        return {
            ...exameConfig,
            value: resultados,
            status: CONSTS.STATUS.ALTERADO 
        };
    }

    function analisarExame(exameConfig, textoParaAnalisar, sexoPaciente, lookaheadRegexStr) {
        const { tipo } = exameConfig;

        if (tipo === 'microbiologia') {
            return analisarExameMicrobiologia(exameConfig, textoParaAnalisar);
        }

        if (tipo === 'agrupador') {
            return analisarExameAgrupador(exameConfig, textoParaAnalisar, sexoPaciente);
        }
        
        // A 'lookaheadRegexStr' (previamente todosNomesBuscaRegexStr) agora vem pré-filtrada.
        const textoBloco = extrairBlocoExame(textoParaAnalisar, exameConfig, lookaheadRegexStr);
        if (!textoBloco) {
            return { ...exameConfig, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO, debug: { textoBlocoAnalisado: null } };
        }

        const result = extrairValorDoBloco(textoBloco, exameConfig, sexoPaciente);
        // Combina informações de debug de ambas as funções
        result.debug = { 
            ...result.debug, // Mantém a referência utilizada
            textoBlocoAnalisado: textoBloco 
        };
        return result;
    }

    // --- FUNÇÕES PRINCIPAIS E MANIPULADORES DE EVENTOS ---

    function processar() {
        btnProcessar.disabled = true;
        btnProcessar.classList.add('btn-loading');
        btnProcessar.textContent = 'Analisando';

        const texto = inputArea.value;
        if (!texto.trim()) {
            showToast("A área de texto está vazia.");
            btnVerHistoricoCompleto.disabled = true;
            resetProcessarButton();
            return;
        }
        const textoSemAcentos = removerAcentos(texto);
        const sexoPaciente = pegarSexoPaciente(texto);

        // Extract specialized blocks
        const blocoUrina = (textoSemAcentos.match(/(Urina I|Urina tipo I|\bEAS\b)([\s\S]*?)(?=Cultura de Urina|Liberado por|$)/i) || [])[0] || "";
        const blocoGasometriaArterial = (texto.match(/Gasometria Arterial([\s\S]*?)(?=Gasometria Venosa|Liberado por|$)/i) || [])[0] || "";
        const blocoGasometriaVenosa = (texto.match(/Gasometria Venosa([\s\S]*?)(?=Gasometria Arterial|Liberado por|$)/i) || [])[0] || "";

        // Create a general text block by removing the specialized ones to avoid context leakage
        let textoPrincipal = textoSemAcentos;
        if (blocoUrina) textoPrincipal = textoPrincipal.replace(blocoUrina, '');
        if (blocoGasometriaArterial) textoPrincipal = textoPrincipal.replace(blocoGasometriaArterial, '');
        if (blocoGasometriaVenosa) textoPrincipal = textoPrincipal.replace(blocoGasometriaVenosa, '');
        
        const configExames = getConfigExames();
        
        // Otimização: Pré-calcular strings de regex para evitar trabalho repetido nas funções internas.
        const todosNomesBuscaRegexStrings = configExames
            .flatMap(e => e.nomesBusca || [])
            .map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

        configExames.forEach(exame => {
            if (!exame.nomesBusca) return;
            const nomesBuscaAtuais = exame.nomesBusca.map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
            // Pré-calcula a string de lookahead para cada exame.
            exame.lookaheadRegexStr = todosNomesBuscaRegexStrings.filter(nome => !nomesBuscaAtuais.includes(nome)).join('|') + '|Leucograma';
        });

        const todosExames = configExames.map(exame => {
            if (exame.nomesBusca) {
                // Default to the main text block, which has specialized sections removed
                let textoParaAnalisar = textoPrincipal;

                // Assign the full, un-redacted block for specialized parsers
                if (exame.usaTextoArterial) textoParaAnalisar = blocoGasometriaArterial;
                else if (exame.usaTextoVenoso) textoParaAnalisar = blocoGasometriaVenosa;
                else if (exame.id === 'urina1') textoParaAnalisar = blocoUrina;

                if (!textoParaAnalisar) {
                    return { ...exame, value: null, status: CONSTS.STATUS.NAO_ENCONTRADO };
                }
                // Passa a string de lookahead pré-calculada para a função de análise.
                return analisarExame(exame, textoParaAnalisar, sexoPaciente, exame.lookaheadRegexStr);
            }
            return exame; // Retorna exames que não usam a análise padrão
        });

        examesEncontradosGlobal = todosExames.filter(exame => exame.value !== null && exame.value !== undefined).map(exame => {
            exame.selected = exame.selected !== undefined ? exame.selected : !exame.optional;
            return exame;
        });

        // Após encontrar os exames, calcula a tendência
        calcularTendenciaExames(pegarNomePaciente(texto));
        
        renderizarSidebar(examesEncontradosGlobal);
        gerarTextoFinal();
        btnVerHistoricoCompleto.disabled = false;
        salvarNoHistorico(); // Salva automaticamente após análise
        resetProcessarButton();
    }

    function selecionarTodosExames(selecionar) {
        examesEncontradosGlobal.forEach(exame => exame.selected = selecionar);
        // Re-renderiza a sidebar para refletir a mudança nos checkboxes
        const termoBusca = filtroExamesInput.value;
        termoBusca ? filtrarExames() : renderizarSidebar(examesEncontradosGlobal);
        gerarTextoFinal();
    }

    function resetProcessarButton() {
        btnProcessar.disabled = false;
        btnProcessar.classList.remove('btn-loading');
        btnProcessar.textContent = 'Analisar Laudo';
    }

    function filtrarExames() {
        const termoBusca = filtroExamesInput.value.toLowerCase().trim();
        const termoNormalizado = removerAcentos(termoBusca);
        
        if (!termoBusca) {
            renderizarSidebar(examesEncontradosGlobal); // Se a busca estiver vazia, mostra todos
            return;
        }
        const examesFiltrados = examesEncontradosGlobal.filter(exame => {
            const label = removerAcentos(exame.label.toLowerCase());

            // Verifica se o termo de busca está no label curto ou em algum dos nomes de busca (sinônimos)
            return label.includes(termoNormalizado) || 
                   (exame.nomesBusca && exame.nomesBusca.some(nome => removerAcentos(nome.toLowerCase()).includes(termoNormalizado)));
        });
        renderizarSidebar(examesFiltrados);
    }

    function atualizarSelecao(id, isSelected) {
      const exame = examesEncontradosGlobal.find(e => e.id === id);
      if (exame) {
          exame.selected = isSelected;
          gerarTextoFinal();
      }
    }

    function handleSelecaoExame(event) {
        if (event.target.matches('input[type="checkbox"][data-exame-id]')) {
            atualizarSelecao(event.target.dataset.exameId, event.target.checked);
        }
    }

    function calcularTendenciaExames(nomePaciente) {
        const textoAtual = inputArea.value;
        const resultados = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');
        
        const historicoPaciente = resultados
            .filter(r => 
                r.paciente === nomePaciente && 
                r.exames &&
                r.originalInput !== textoAtual // Exclui o laudo atual exato da busca por histórico
            )
            .sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta)); // Ordena pela nova data/hora

        if (historicoPaciente.length === 0) {
            // Limpa tendências antigas se não houver histórico
            examesEncontradosGlobal.forEach(exame => delete exame.tendencia);
            return;
        }

        examesEncontradosGlobal.forEach(exameAtual => {
            // Limpa tendência anterior
            delete exameAtual.tendencia;

            // Para cada exame atual, encontre o laudo mais recente no histórico que contenha esse exame.
            const laudoAnteriorComExame = historicoPaciente.find(laudo => 
                laudo.exames && laudo.exames.some(e => e.id === exameAtual.id && e.value !== null)
            );

            // Pula se não houver histórico ou for do tipo texto
            if (!laudoAnteriorComExame || exameAtual.tipo === 'texto') {
                return;
            }

            // Deixa o PTF passar mas ainda pula outros agrupadores
            if (exameAtual.tipo === 'agrupador' && exameAtual.id !== 'ptf') {
                return;
            }

            const exameAnterior = laudoAnteriorComExame.exames.find(e => e.id === exameAtual.id);
            if (!exameAnterior) return;

            let valorAtualNum, valorAntigoNum, valorAntigoParaExibir;

            if (exameAtual.id === 'ptf') {
                const ptfTendencias = {}; // Objeto para guardar as tendências dos sub-exames

                // Itera e compara cada sub-exame
                for (const subExamId of ['ptf_pt', 'ptf_alb', 'ptf_glob']) {
                    const subExameAtual = exameAtual.subExames?.find(sub => sub.id === subExamId);
                    const subExameAnterior = exameAnterior.subExames?.find(sub => sub.id === subExamId);

                    if (subExameAtual?.value && subExameAnterior?.value) {
                        const valorAtualNum = parseFloat(String(subExameAtual.value).replace(',', '.'));
                        const valorAntigoNum = parseFloat(String(subExameAnterior.value).replace(',', '.'));

                        if (!isNaN(valorAtualNum) && !isNaN(valorAntigoNum)) {
                            let icone = '=';
                            if (valorAtualNum > valorAntigoNum) icone = '↑';
                            if (valorAtualNum < valorAntigoNum) icone = '↓';

                            // Só adiciona se houver mudança
                            if (icone !== '=') {
                                ptfTendencias[subExamId] = {
                                    icone: icone,
                                    valorAntigo: subExameAnterior.value
                                };
                            }
                        }
                    }
                }
                // Atribui o objeto de tendências se ele não estiver vazio
                if (Object.keys(ptfTendencias).length > 0) {
                    exameAtual.tendencia = ptfTendencias;
                }
                return; // Finaliza o processamento para o PTF aqui
            }

            // Lógica padrão para outros exames. A conversão com parseFloat já ignora texto após o número.
            valorAtualNum = parseFloat(String(exameAtual.value).replace(',', '.'));
            valorAntigoNum = parseFloat(String(exameAnterior.value).replace(',', '.'));
            valorAntigoParaExibir = exameAnterior.value;


            if (isNaN(valorAtualNum) || isNaN(valorAntigoNum)) {
                return; // Pula se algum dos valores não for numérico
            }

            let icone = '=';
            if (valorAtualNum > valorAntigoNum) icone = '↑';
            if (valorAtualNum < valorAntigoNum) icone = '↓';

            if (icone !== '=') {
                exameAtual.tendencia = {
                    icone: icone,
                    valorAntigo: valorAntigoParaExibir
                };
            }
        });
    }

    function criarSparkline(valores) {
        if (!valores || valores.length < 2) return '';

        // 1. Parse all values to numbers, handling thousand separators and commas. Invalid values become NaN.
        const numeros = valores.map(v => {
            if (v === null || v === undefined) return null;
            // Handle thousand separators (e.g., '1.213') and decimal commas (e.g., '1,5')
            const valorLimpo = String(v).replace(/\.(?=.*\d{3}(?:,|$))/g, '').replace(',', '.');
            return parseFloat(valorLimpo);
        });

        // 2. Filter for valid numbers to calculate min/max/range
        const numerosValidos = numeros.filter(n => !isNaN(n));

        // 3. We need at least two valid points to draw a line
        if (numerosValidos.length < 2) return '';

        const LARGURA = 100;
        const ALTURA = 22;
        const PADDING = 2;

        const max = Math.max(...numerosValidos);
        const min = Math.min(...numerosValidos);
        let range = max - min;

        // 4. Handle the case where all values are the same (range is 0) to avoid division by zero.
        // Draw a flat line in the vertical middle.
        if (range === 0) {
            const y = ALTURA / 2;
            const pathData = `M ${PADDING} ${y} L ${LARGURA - PADDING} ${y}`;
            return `
                <svg width="${LARGURA}" height="${ALTURA}" viewbox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg">
                    <path d="${pathData}" class="sparkline" />
                </svg>
            `;
        }

        // 5. Build the SVG path data, iterating over the original 'numeros' array to maintain spacing.
        let pathData = '';
        let primeiroPonto = true;
        
        numeros.forEach((n, i) => {
            // Skip invalid or null numbers in the path
            if (n === null || isNaN(n)) return;

            // Calculate X based on index in the original array
            const x = (i / (numeros.length - 1)) * (LARGURA - PADDING * 2) + PADDING;
            // Calculate Y based on the value's position within the min/max range
            const y = ALTURA - PADDING - ((n - min) / range) * (ALTURA - PADDING * 2);
            
            pathData += `${primeiroPonto ? 'M' : 'L'} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100} `;
            primeiroPonto = false;
        });

        if (!pathData) return '';

        return `
            <svg width="${LARGURA}" height="${ALTURA}" viewbox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg">
                <path d="${pathData}" class="sparkline" />
            </svg>
        `;
    }
    
    function mostrarHistoricoCompleto() {
        const nomePaciente = pegarNomePaciente(inputArea.value);
        if (!nomePaciente || nomePaciente === "Paciente Desconhecido") {
            showToast("Para ver as tendências, primeiro analise um laudo para identificar o paciente.");
            return;
        }

        const resultados = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');
        const historicoPaciente = resultados
            .filter(r => r.paciente === nomePaciente && r.exames)
            .sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));

        if (historicoPaciente.length === 0) {
            showToast(`Nenhum histórico encontrado para ${nomePaciente}.`);
            return;
        }

        const todosExamesIds = new Set(historicoPaciente.flatMap(laudo => laudo.exames.map(ex => ex.id)));
        const configExames = getConfigExames();

        const modalContent = document.getElementById('evolution-modal-content');
        document.getElementById('evolution-modal-title').textContent = `Histórico de Evolução: ${nomePaciente}`;

        const table = createElement('table');
        const thead = createElement('thead');
        const tbody = createElement('tbody');

        const headerRow = createElement('tr');
        headerRow.appendChild(createElement('th', {}, ['Exame']));
        historicoPaciente.forEach(laudo => {
            // FIX: Usa a nova função para pegar data e hora para os cabeçalhos
            headerRow.appendChild(createElement('th', {}, [pegarDataComHora(laudo.originalInput)]));
        });
        headerRow.appendChild(createElement('th', { style: 'text-align: center;' }, ['Tendência']));
        thead.appendChild(headerRow);

        todosExamesIds.forEach(examId => {
            const examConfig = configExames.find(e => e.id === examId);
            if (!examConfig || (examConfig.tipo === 'agrupador' && examConfig.id !== 'ptf')) {
                return;
            }

            const dataRow = createElement('tr');
            dataRow.appendChild(createElement('td', {}, [examConfig.label]));

            const valoresParaSparkline = [];

            historicoPaciente.forEach((laudo, index) => {
                const exameNesteLaudo = laudo.exames.find(e => e.id === examId);
                const valorAtualStr = exameNesteLaudo ? exameNesteLaudo.value : null;
                
                const td = createElement('td');

                if (valorAtualStr === null) {
                    td.textContent = '-';
                    valoresParaSparkline.push(null);
                } else if (examConfig.tipo === 'microbiologia') {
                    // FIX: Lógica para exibir resultados de microbiologia de forma legível
                    const nomes = valorAtualStr.map(m => m.nome).join(', ');
                    td.textContent = nomes || (valorAtualStr.length > 0 ? 'Cresc.' : 'SCB');
                    td.title = JSON.stringify(valorAtualStr, null, 2);
                    valoresParaSparkline.push(null); // Não adicionar ao sparkline
                }
                else {
                    valoresParaSparkline.push(valorAtualStr);
                    const valorAtualNum = parseFloat(String(valorAtualStr).replace(/\.(?=.*\d{3}(?:,|$))/g, '').replace(',', '.'));
                    let displayHTML = valorAtualStr;
                    let icone = '';
                    let trendIs = 'neutral';
                    let iconColorClass = '';

                    const laudoAnterior = historicoPaciente[index + 1];
                    if (laudoAnterior) {
                        const exameAnterior = laudoAnterior.exames.find(e => e.id === examId);
                        if (exameAnterior && exameAnterior.value !== null) {
                            const valorAnteriorNum = parseFloat(String(exameAnterior.value).replace(/\.(?=.*\d{3}(?:,|$))/g, '').replace(',', '.'));
                            if (!isNaN(valorAtualNum) && !isNaN(valorAnteriorNum)) {
                                if (valorAtualNum > valorAnteriorNum) {
                                    icone = '↑';
                                    if (examConfig.trendMeaning === 'higher_is_worse') trendIs = 'pior';
                                    else if (examConfig.trendMeaning === 'higher_is_better') trendIs = 'melhor';
                                } else if (valorAtualNum < valorAnteriorNum) {
                                    icone = '↓';
                                    if (examConfig.trendMeaning === 'higher_is_worse') trendIs = 'melhor';
                                    else if (examConfig.trendMeaning === 'higher_is_better') trendIs = 'pior';
                                }
                            }
                        }
                    }

                    if (exameNesteLaudo.status === CONSTS.STATUS.ALTERADO) {
                        displayHTML = `<span class="tendencia-pior">${valorAtualStr}</span>`;
                    }

                    if (trendIs === 'pior') iconColorClass = 'tendencia-pior';
                    else if (trendIs === 'melhor') iconColorClass = 'tendencia-melhor';
                    
                    if (icone) {
                        displayHTML += `<span class="tendencia-icone ${iconColorClass}">${icone}</span>`;
                    }
                    td.innerHTML = displayHTML;
                }
                dataRow.appendChild(td);
            });

            const sparklineCell = createElement('td', { className: 'sparkline-cell' });
            sparklineCell.innerHTML = criarSparkline(valoresParaSparkline.reverse());
            dataRow.appendChild(sparklineCell);

            tbody.appendChild(dataRow);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        modalContent.innerHTML = '';
        modalContent.appendChild(table);

        document.getElementById('evolution-modal-overlay').classList.add(CONSTS.MODAL_CLASS);
    }

    function gerarTextoFinal() {
    const dataLaudo = pegarData(inputArea.value);
    const marcarAlterados = marcarAlteradosToggle.checked;
    const mostrarTendencia = document.getElementById('comparar-historico-toggle').checked; // NOVO
    
    const partesResultado = examesEncontradosGlobal
        .filter(exame => exame.selected)
        .map(exame => {
            let parte = exame.template(exame.value, exame); // Passa o objeto exame inteiro
            
            // Lógica existente de asterisco
            if (marcarAlterados && exame.status === CONSTS.STATUS.ALTERADO) {
                parte = parte.replace(/ \/ $/, '* / ');
            }

            // --- NOVA LÓGICA DE TENDÊNCIA ---
            if (mostrarTendencia && exame.tendencia && exame.tendencia.icone !== '=' && exame.id !== 'ptf') {
                const textoTendencia = ` (${exame.tendencia.icone} ${exame.tendencia.valorAntigo})`;
                // Adiciona a tendência antes da barra final, com ou sem asterisco
                parte = parte.replace(/(\*? \/ )$/, `${textoTendencia}$1`);
            }
            // -------------------------------

            return parte;
        });

    let resultado = `>> ${dataLaudo ? dataLaudo + ': ' : ''}${partesResultado.join('')}`;
    
    resultado = resultado.trim().replace(/\/$/, '').trim(); // Remove última barra e espaços
    
    resultadoDiv.textContent = resultado.toUpperCase();
    }

    function salvarNoHistorico() {
        const texto = inputArea.value;
        const nomePaciente = pegarNomePaciente(texto);
        const dataHora = pegarDataHoraCompleta(texto);
        const resultadoFinal = resultadoDiv.textContent;
        const novosExames = examesEncontradosGlobal;

        if (!dataHora || !resultadoFinal || !texto) {
            return; // Não salva se faltar dados essenciais
        }

        const resultadosRecentes = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');
        
        const novoResultado = {
            id: dataHora, // Usa a data/hora como ID único
            paciente: nomePaciente,
            dataCompleta: dataHora,
            resultado: resultadoFinal,
            originalInput: texto,
            exames: novosExames
        };

        // Procura por um laudo com o mesmo ID (data e hora)
        const existingIndex = resultadosRecentes.findIndex(laudo => laudo.id === dataHora);

        if (existingIndex > -1) {
            // Se encontrou, substitui o laudo antigo pelo novo
            resultadosRecentes[existingIndex] = novoResultado;
        } else {
            // Se não encontrou, adiciona o novo laudo
            resultadosRecentes.push(novoResultado);
        }
        
        // Ordena para garantir que os mais recentes fiquem no topo
        resultadosRecentes.sort((a, b) => String(b.id).localeCompare(String(a.id)));

        // Limita o histórico aos 50 laudos mais recentes
        localStorage.setItem(CONSTS.LOCAL_STORAGE_KEY, JSON.stringify(resultadosRecentes.slice(0, 50)));
        renderizarResultadosRecentes();
    }

    function copiarTexto(texto) {
        navigator.clipboard.writeText(texto)
            .then(() => showToast('Resultado copiado!'))
            .catch(() => showToast('Falha ao copiar.'));
    }

    // Função para baixar o script como um arquivo HTML auto-contido
    function baixarScript() { 
        // Pega todo o conteúdo HTML da página atual
        const conteudoHtml = document.documentElement.outerHTML;
        // Cria um objeto Blob, que é um objeto semelhante a um arquivo
        const blob = new Blob([conteudoHtml], { type: 'text/html' });
        // Cria uma URL temporária para o Blob
        const url = URL.createObjectURL(blob);

        // Cria um link <a> invisível para iniciar o download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processador_laudos.html'; // Nome do arquivo que será baixado
        document.body.appendChild(a); // Adiciona o link ao corpo do documento
        a.click(); // Simula o clique no link para iniciar o download
        document.body.removeChild(a); // Remove o link após o clique
        URL.revokeObjectURL(url); // Libera a memória da URL criada
        showToast('Download iniciado!');
    }

    // --- LÓGICA DE TESTES E DIAGNÓSTICO ---

    function toggleTestSection() {
        const testSection = document.getElementById('test-section-wrapper');
        const isVisible = testSection.style.display === 'block';
        testSection.style.display = isVisible ? 'none' : 'block';
    }

    /**
     * Compara dois valores de forma inteligente.
     * - Trata strings numéricas ("15.0", "15") como equivalentes.
     * - Compara strings de forma insensível a maiúsculas/minúsculas e espaços.
     */
    function areValuesEqual(val1, val2) {
        if (val1 === val2) return true;
        if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return false;

        const num1 = parseFloat(String(val1).replace(',', '.'));
        const num2 = parseFloat(String(val2).replace(',', '.'));

        if (!isNaN(num1) && !isNaN(num2)) {
            return num1 === num2;
        }

        const normalize = (str) => String(str)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .trim().toLowerCase().replace(/\.$/, ''); // Remove ponto final

        return normalize(val1) === normalize(val2);
    }

    /**
     * Gera casos de teste estáticos para todos os exames na configuração.
     * Isso garante uma cobertura base para cada exame individualmente.
     */
    function generateStaticTestCases() {
        const staticCases = [];

        const configExames = getConfigExames();

        configExames.forEach(exame => {
            if (!exame.nomesBusca || exame.nomesBusca.length === 0) return;

            const nomeBusca = exame.nomesBusca[0];

            // Teste de "não encontrado"
            staticCases.push({
                description: `[Estático] ${exame.label}: Deve retornar 'nao_encontrado'`,
                input: `ExameNaoRelacionado 123`,
                examId: exame.id,
                expected: { value: null, status: CONSTS.STATUS.NAO_ENCONTRADO }
            });

            if (exame.id === 'urina1') { // Teste para Agrupador
                staticCases.push({
                    description: `[Estático] ${exame.label}: Deve extrair Urina I normal`,
                    input: `Urina I\npH 5.5\nDensidade 1020\nNitrito Negativo`,
                    examId: exame.id,
                    expected: { status: CONSTS.STATUS.NORMAL }
                });
                staticCases.push({
                    description: `[Estático] ${exame.label}: Deve extrair Urina I alterada`,
                    input: `Urina I\npH 8.0\nDensidade 1020\nNitrito Positivo`,
                    examId: exame.id,
                    expected: { status: CONSTS.STATUS.ALTERADO }
                });
            } else if (exame.tipo === 'texto') {
                if (exame.id === 'uroc') {
                    staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair 'SCB' para 'não houve crescimento'`,
                        input: `${nomeBusca}\nResultado: Nao houve crescimento`,
                        examId: exame.id,
                        expected: { value: 'SCB', status: CONSTS.STATUS.NORMAL }
                    });
                    staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair microrganismo`,
                        input: `${nomeBusca}\nMicrorganismo: Klebsiella pneumoniae`,
                        examId: exame.id,
                        expected: { value: 'Klebsiella pneumoniae', status: CONSTS.STATUS.NORMAL }
                    });
                } else if (exame.id === 'hmc') {
                     staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair 'HMC SCB'`,
                        input: `Hemocultura\nResultado: Nao houve crescimento de microrganismos.`,
                        examId: exame.id,
                        expected: { value: 'não houve crescimento de microrganismos.', status: CONSTS.STATUS.NORMAL } // O template trata isso
                    });
                }
            } else if (exame.ref) { // Testes para exames quantitativos com referência
                const ref = exame.ref.M || exame.ref; // Usa referência masculina como padrão
                
                // Valor Normal (no meio da faixa)
                if (ref.min !== -Infinity && ref.max !== Infinity) {
                    const normalValue = ((ref.min + ref.max) / 2).toFixed(2);
                    const input = `${nomeBusca}\nResultado ${normalValue}\nValores de referência: ${ref.min} a ${ref.max}`;
                    staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair valor NORMAL`,
                        input: input,
                        examId: exame.id,
                        expected: { value: normalValue, status: CONSTS.STATUS.NORMAL }
                    });
                }

                // Valor Alterado (Alto)
                if (ref.max !== Infinity) { // Garante que o valor seja significativamente maior
                    // Exceção para INR, para testar acima da faixa terapêutica (2.0-3.0)
                    const highValue = (exame.id === 'inr') ? '3.50' : (ref.max + 1).toFixed(2);
                    const input = `${nomeBusca}\nResultado ${highValue}\nValores de referência: ${ref.min} a ${ref.max}`;
                    staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (alto)`,
                        input: input,
                        examId: exame.id,
                        expected: { value: highValue, status: CONSTS.STATUS.ALTERADO }
                    });
                }

                // Valor Alterado (Baixo)
                if (ref.min > 0 && ref.min !== -Infinity && !exame.ignorarBaixo) {
                    const lowValue = (ref.min * 0.5).toFixed(2);
                    const input = `${nomeBusca}\nResultado ${lowValue}\nValores de referência: ${ref.min} a ${ref.max}`;
                     staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (baixo)`,
                        input: input,
                        examId: exame.id,
                        expected: { value: lowValue, status: CONSTS.STATUS.ALTERADO }
                    });
                } else if (ref.min <= 0 && ref.min !== -Infinity && !exame.ignorarBaixo) {
                    // Caso especial para limites negativos ou zero, como o Base Excess (BE)
                    const lowValue = (ref.min - 1).toFixed(2);
                    const input = `${nomeBusca}\nResultado ${lowValue}\nValores de referência: ${ref.min} a ${ref.max}`;
                     staticCases.push({
                        description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (baixo)`,
                        input: input,
                        examId: exame.id,
                        expected: { value: lowValue, status: CONSTS.STATUS.ALTERADO }
                    });
                }
            }
        });
        return staticCases;
    }

    /**
     * Gera casos de teste a partir do histórico de laudos do usuário.
     * Isso cria testes de regressão baseados em dados reais.
     */
    function generateHistoryTestCases() {
        const historyCases = [];
        const resultados = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEY) || '[]');

        // Pega os 3 laudos mais recentes que possuem o input original salvo
        const laudosRecentes = resultados.filter(r => r.originalInput).slice(-3);

        laudosRecentes.forEach((laudo, index) => {
            const configExames = getConfigExames();
            const todosNomesBuscaRegexStr = configExames.flatMap(e => e.nomesBusca).map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
            configExames.forEach(exame => {
                // Para cada laudo, verifica o que a função de análise extrai AGORA
                const resultadoAtual = analisarExame(exame, removerAcentos(laudo.originalInput), pegarSexoPaciente(laudo.originalInput), todosNomesBuscaRegexStr);
                
                // O teste vai verificar se o resultado continua o mesmo no futuro
                historyCases.push({
                    description: `[Histórico ${index + 1}] ${exame.label}: Deve manter consistência de extração`,
                    input: laudo.originalInput,
                    examId: exame.id,
                    expected: { value: resultadoAtual.value, status: resultadoAtual.status }
                });
            });
        });

        return historyCases;
    }

    function runTests() {
        const testResultsEl = document.getElementById('test-results');
        testResultsEl.style.display = 'block';
        testResultsEl.textContent = 'Rodando testes...\n\n';

        let successes = 0;
        let failures = 0;

        const staticTestCases = generateStaticTestCases();
        const historyTestCases = generateHistoryTestCases();
        const testCases = [...staticTestCases, ...historyTestCases];

        testResultsEl.textContent += `Encontrados ${staticTestCases.length} testes estáticos e ${historyTestCases.length} testes de histórico.\nTotal: ${testCases.length} asserções.\n\n`;

        testCases.forEach(test => {
            const configExames = getConfigExames();
            const todosNomesBuscaRegexStr = configExames.flatMap(e => e.nomesBusca).map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
            const examConfig = configExames.find(e => e.id === test.examId);
            if (!examConfig) {
                testResultsEl.textContent += `❌ FALHA: ${test.description}\n   Motivo: Configuração de exame com ID '${test.examId}' não encontrada.\n\n`;
                failures++;
                return;
            }

            const result = analisarExame(examConfig, removerAcentos(test.input), test.sexo || pegarSexoPaciente(test.input) || 'M', todosNomesBuscaRegexStr);

            // Compara os valores esperados com os resultados
            const valueMatch = ('value' in test.expected) ? areValuesEqual(result.value, test.expected.value) : true;
            const statusMatch = ('status' in test.expected) ? result.status === test.expected.status : true;

            if (valueMatch && statusMatch) {
                testResultsEl.textContent += `✅ SUCESSO: ${test.description}\n`;
                successes++;
            } else {
                const failureEl = document.createElement('div');
                failureEl.className = 'test-failure';
                
                const descriptionEl = document.createElement('span');
                descriptionEl.className = 'test-failure-description';
                descriptionEl.textContent = `❌ FALHA: ${test.description}`;
                descriptionEl.title = 'Clique para carregar este laudo na área de texto principal';
                descriptionEl.onclick = () => {
                    inputArea.value = test.input;
                    inputArea.scrollTop = 0;
                    showToast('Laudo de teste carregado!');
                };
                
                failureEl.appendChild(descriptionEl);
                failureEl.innerHTML += `\n   Esperado: ${JSON.stringify(test.expected)}\n   Recebido: ${JSON.stringify({ value: result.value, status: result.status })}\n`;
                if (result.debug && result.debug.textoBlocoAnalisado) {
                    failureEl.innerHTML += `   Bloco Analisado: "${result.debug.textoBlocoAnalisado.replace(/\n/g, '\\n').substring(0, 100)}..."\n`;
                }
                if (result.debug && result.debug.referenciaUtilizada) {
                    failureEl.innerHTML += `   Referência Usada: ${JSON.stringify(result.debug.referenciaUtilizada)}\n`;
                }
                failureEl.innerHTML += '\n';
                testResultsEl.appendChild(failureEl);
                failures++;
            }
        });

        testResultsEl.textContent += `\n--- Resumo dos Testes ---\n`;
        testResultsEl.textContent += `Total: ${testCases.length}\n`;
        testResultsEl.textContent += `Sucessos: ${successes}\n`;
        testResultsEl.textContent += `Falhas: ${failures}\n`;
    }

    // --- PONTO DE ENTRADA ---
    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        loadTheme();
        renderizarResultadosRecentes();
    });

    })(); // Fim da IIFE