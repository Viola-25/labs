const config = [
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
  { id: 'u', label: 'UR', nomesBusca: ["Ureia", "Ureia, serica"], ref: { M: { min: 19, max: 43 }, F: { min: 15, max: 36 } }, trendMeaning: 'higher_is_worse' },
  { id: 'cr', label: 'CR', nomesBusca: ["Creatinina", "Dosagem serica de Creatinina"], ref: { M: { min: 0.66, max: 1.25 }, F: { min: 0.52, max: 1.04 } }, trendMeaning: 'higher_is_worse' },
  {
    id: 'ptf', label: 'PTF',
    nomesBusca: ["Proteína Total e Frações", "Proteina Total e Fracoes"],
    tipo: 'agrupador',
    subExames: [
      { id: 'ptf_pt', label: 'Proteínas', nomesBusca: ["Proteinas", "Proteínas", "Proteinas Totais", "Proteínas Totais"], ref: { min: 6.0, max: 8.3 } },
      { id: 'ptf_alb', label: 'Albumina', nomesBusca: ["Albumina"], ref: { min: 3.5, max: 5.0 }, trendMeaning: 'higher_is_better' },
      { id: 'ptf_glob', label: 'Globulina', nomesBusca: ["Globulina"], ref: { min: 2.0, max: 3.5 } }
    ],
    template: (v, exame) => {
      const mostrarTendencia = document.getElementById('comparar-historico-toggle').checked;
      const pt = exame.subExames?.find(sub => sub.id === 'ptf_pt')?.value;
      const alb = exame.subExames?.find(sub => sub.id === 'ptf_alb')?.value;
      const glob = exame.subExames?.find(sub => sub.id === 'ptf_glob')?.value;
      let ptT = '', albT = '', globT = '';
      if (mostrarTendencia && exame.tendencia) {
        if (exame.tendencia.ptf_pt) ptT = ` (${exame.tendencia.ptf_pt.icone} ${exame.tendencia.ptf_pt.valorAntigo})`;
        if (exame.tendencia.ptf_alb) albT = ` (${exame.tendencia.ptf_alb.icone} ${exame.tendencia.ptf_alb.valorAntigo})`;
        if (exame.tendencia.ptf_glob) globT = ` (${exame.tendencia.ptf_glob.icone} ${exame.tendencia.ptf_glob.valorAntigo})`;
      }
      if (pt || alb) return `PTF ${pt || '?'}${ptT} (A ${alb || '?'}${albT}, G ${glob || '?'}${globT}) / `;
      return `PTF ${v}${ptT} / `;
    }
  },
  { id: 'na', label: 'NA', nomesBusca: ["Sódio"], ref: { min: 137, max: 145 } },
  { id: 'k', label: 'K', nomesBusca: ["Potassio"], ref: { min: 3.5, max: 5.1 } },
  { id: 'mg', label: 'MG', nomesBusca: ["Magnésio"], ref: { min: 1.8, max: 2.4 } },
  {
    id: 'bilirrubinas', label: 'Bilirrubinas',
    nomesBusca: ["Bilirrubina Total e Frações", "Bilirrubinas", "Bilirrubina Total"],
    tipo: 'agrupador',
    subExames: [
      { id: 'bt', label: 'BT', nomesBusca: ["Bilirrubina Total"], ref: { min: 0.2, max: 1.2 }, ignorarBaixo: true, trendMeaning: 'higher_is_worse' },
      { id: 'bd', label: 'BD', nomesBusca: ["Bilirrubina Direta"], ref: { min: 0.0, max: 0.3 }, trendMeaning: 'higher_is_worse' },
      { id: 'bi', label: 'BI', nomesBusca: ["Bilirrubina Indireta"], ref: { min: 0.1, max: 0.8 }, trendMeaning: 'higher_is_worse' }
    ],
    template: (v, exame) => {
      const bt = exame.subExames?.find(sub => sub.id === 'bt')?.value || '?';
      const bd = exame.subExames?.find(sub => sub.id === 'bd')?.value || '?';
      const bi = exame.subExames?.find(sub => sub.id === 'bi')?.value || '?';
      return `BT ${bt} (BD ${bd}, BI ${bi}) / `;
    }
  },
  { id: 'tgo', label: 'TGO', nomesBusca: ["TGO/AST", "AST", "TGO"], ref: { M: { min: 17, max: 59 }, F: { min: 14, max: 36 } }, trendMeaning: 'higher_is_worse' },
  { id: 'tgp', label: 'TGP', nomesBusca: ["TGP/ALT", "ALT", "TGP"], ref: { M: { min: -Infinity, max: 50 }, F: { min: -Infinity, max: 35 } }, trendMeaning: 'higher_is_worse' },
  { id: 'ggt', label: 'GGT', nomesBusca: ["Gama Glutamil Transferase", "Gama Glutamil Transferase - GGT"], ref: { M: { min: 15, max: 73 }, F: { min: 12, max: 43 } }, trendMeaning: 'higher_is_worse' },
  { id: 'fal', label: 'FA', nomesBusca: ["Fosfatase Alcalina"], ref: { min: 30, max: 120 }, trendMeaning: 'higher_is_worse' },
  { id: 'dhl', label: 'DHL', nomesBusca: ["DHL", "Desidrogenase Lactica"], ref: { min: 120, max: 246 }, trendMeaning: 'higher_is_worse' },
  { id: 'amil', label: 'AMIL', nomesBusca: ["Amilase"], ref: { min: 25, max: 125 }, trendMeaning: 'higher_is_worse' },
  { id: 'pcr', label: 'PCR', nomesBusca: ["Proteína C Reativa - PCR"], ref: { min: -Infinity, max: 0.5 }, trendMeaning: 'higher_is_worse' },
  { id: 'inr', label: 'INR', nomesBusca: ["RNI", "INR"], ref: { min: 1.0, max: 1.2 }, trendMeaning: 'higher_is_worse' },
  { id: 'r', label: 'R', nomesBusca: ["Relacao paciente/normal"], ref: { min: 0.85, max: 1.20 } },
  { id: 'dimd', label: 'D-Dim', nomesBusca: ["D-Dimero", "D-Dimer"], ref: { min: -Infinity, max: 500 }, trendMeaning: 'higher_is_worse' },
  { id: 'reti', label: 'Retic', nomesBusca: ["Contagem de Reticulócitos", "Reticulocitos", "RETI"], ref: { min: 0.5, max: 2.0 } },
  { id: 'ferro', label: 'Ferro', nomesBusca: ["Ferro", "FER"], ref: { M: { min: 65, max: 175 }, F: { min: 50, max: 170 } } },
  { id: 'ferritina', label: 'Ferritina', nomesBusca: ["Ferritina", "FERRI"], ref: { M: { min: 22.0, max: 322.0 }, F: { min: 10.0, max: 291.0 } } },
  { id: 'transferrina', label: 'Transferrina', nomesBusca: ["Transferrina", "TRA"], ref: { M: { min: 215, max: 365 }, F: { min: 250, max: 380 } } },
  { id: 'tibc', label: 'TIBC', nomesBusca: ["Capacidade total de ligação do ferro", "TIBC", "CAPFER"], ref: { min: 250, max: 425 } },
  { id: 'tfg', label: 'TFG', nomesBusca: ["TFG", "TFG - Taxa de Filtração Glomerular", "Ritmo de Filtracao Glomerular", "RFG"], optional: true, ref: { min: 90, max: Infinity }, trendMeaning: 'higher_is_better' },
  { id: 'au', label: 'AU', nomesBusca: ["Acido Urico"], optional: true, ref: { M: { min: 3.5, max: 7.2 }, F: { min: 2.6, max: 6.0 } }, trendMeaning: 'higher_is_worse' },
  { id: 'cl', label: 'Cl', nomesBusca: ["Cloro"], ref: { min: 98, max: 107 } },
  { id: 'cai', label: 'Cai', nomesBusca: ["Calcio Ionizado"], ref: { min: 1.12, max: 1.30 } },
  { id: 'ca', label: 'Ca', nomesBusca: ["Calcio"], ref: { min: 8.4, max: 11.0 } },
  { id: 'p', label: 'P', nomesBusca: ["Fosforo"], ref: { min: 2.5, max: 4.5 } },
  { id: 'ct', label: 'CT', nomesBusca: ["Colesterol Total"], ref: { min: -Infinity, max: 190 }, trendMeaning: 'higher_is_worse' },
  { id: 'hdl', label: 'HDL', nomesBusca: ["Colesterol HDL"], ref: { M: { min: 40, max: Infinity }, F: { min: 50, max: Infinity } }, trendMeaning: 'higher_is_better' },
  { id: 'ldl', label: 'LDL', nomesBusca: ["Colesterol LDL"], ref: { min: -Infinity, max: 130 }, trendMeaning: 'higher_is_worse' },
  { id: 'tg', label: 'TGL', nomesBusca: ["Triglicerides", "TGL"], ref: { min: -Infinity, max: 175 }, trendMeaning: 'higher_is_worse' },
  { id: 'vldl', label: 'VLDL', nomesBusca: ["Colesterol VLDL"], ref: { min: -Infinity, max: 30 }, trendMeaning: 'higher_is_worse' },
  { id: 'glic', label: 'Glic', nomesBusca: ["Glicose", "Glicemia"], ref: { min: 70, max: 99 }, trendMeaning: 'higher_is_worse' },
  { id: 'lact', label: 'Lact', nomesBusca: ["Lactato"], ref: { min: 0.5, max: 2.2 }, trendMeaning: 'higher_is_worse' },
  { id: 'hba1c', label: 'HbA1c', nomesBusca: ["Hemoglobina Glicada", "HbA1c"], ref: { min: -Infinity, max: 5.7 }, trendMeaning: 'higher_is_worse' },
  { id: 'trop', label: 'Trop', nomesBusca: ["Troponina I de Alta Sensibilidade – hs TnI", "Troponina I", "Troponina T", "Troponina Ultrassensivel"], ref: { min: -Infinity, max: 19 }, trendMeaning: 'higher_is_worse' },
  { id: 'ck', label: 'CK', nomesBusca: ["CK - Creatinofosfoquinase", "CK Total", "Creatinoquinase"], ref: { M: { min: 55, max: 170 }, F: { min: 30, max: 135 } }, trendMeaning: 'higher_is_worse' },
  { id: 'ckmb', label: 'CKMB', nomesBusca: ["Dosagem sérica de CKMB - Creatino Fosfoquinase", "CK-MB"], ref: { min: -Infinity, max: 16 }, trendMeaning: 'higher_is_worse' },
  { id: 'bnp', label: 'BNP', nomesBusca: ["BNP", "NT-proBNP", "Peptideo Natriuretico"], ref: { min: -Infinity, max: 100 }, trendMeaning: 'higher_is_worse' },
  { id: 'lip', label: 'Lip', nomesBusca: ["Lipase"], ref: { min: 10, max: 140 }, trendMeaning: 'higher_is_worse' },
  { id: 'hiv', label: 'HIV', nomesBusca: ["Anticorpos Anti-HIV", "HIV"], tipo: 'texto', template: v => 'HIV ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
  { id: 'vdrl', label: 'VDRL', nomesBusca: ["Reação de VDRL", "VDRL"], tipo: 'texto', template: v => 'VDRL ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
  { id: 'hcv', label: 'Anti-HCV', nomesBusca: ["Hepatite C, anticorpos", "HEPC"], tipo: 'texto', template: v => 'Anti-HCV ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
  { id: 'hbsag', label: 'HBsAg', nomesBusca: ["Hepatite B, antígeno HBs (HBsAg)", "HBSG"], tipo: 'texto', template: v => 'HBsAg ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
  { id: 'hbc_igm', label: 'Anti-HBc IgM', nomesBusca: ["Hepatite B, anticorpos anti-HBc IgM", "HBCM"], tipo: 'texto', template: v => 'Anti-HBc IgM ' + (v.toLowerCase().includes('nao reagente') ? 'NR / ' : `Reagente (${v}) / `) },
  { id: 'hbs', label: 'Anti-HBs', nomesBusca: ["Hepatite B, anticorpos anti-HBs", "AHBS"], ref: { min: 10, max: Infinity } },
  { id: 'cult_vig', label: 'Cultura Vig.', nomesBusca: ["Cultura de Vigilância", "CVIG", "CVIG2", "CVIG3"], tipo: 'texto', template: v => 'Cult Vig: ' + (v.toLowerCase().includes('nao houve crescimento') ? 'Neg / ' : `Pos (${v}) / `) },
  {
    id: 'hmc', label: 'HMC',
    nomesBusca: ["Hemocultura", "Hemoculturas"],
    tipo: 'texto',
    template: (v) => {
      const vl = v.toLowerCase();
      if (vl.includes("não houve crescimento") || vl.includes("nao houve crescimento")) return 'HMC SCB / ';
      if (vl.includes("crescimento")) return 'HMC POS / ';
      return `HMC ${v} / `;
    }
  },
  {
    id: 'uroc', label: 'Urocultura',
    nomesBusca: ["Cultura de Urina", "Urocultura"],
    tipo: 'texto',
    template: (v, exame) => (exame.value === 'SCB') ? 'Urocultura SCB / ' : `Urocultura ${v} / `
  },
  {
    id: 'cultura_aerobios', label: 'Cultura Aeróbios',
    nomesBusca: ["Cultura de Aeróbios"],
    tipo: 'microbiologia',
    template: (v) => {
      if (!v || v.length === 0) return 'Cultura Aeróbios: SCB / ';
      const material = v[0]?.material || 'N/A';
      const partes = v.map(m => {
        let str = m.nome;
        if (m.sensiveis?.length) str += ` (S: ${m.sensiveis.join(', ')})`;
        if (m.resistentes?.length) str += ` (R: ${m.resistentes.join(', ')})`;
        return str;
      });
      return `Cultura (${material}): ${partes.join(' + ')} / `;
    }
  },
  { id: 'tsh', label: 'TSH', nomesBusca: ["TSH"], ref: { min: 0.4, max: 4.5 }, trendMeaning: 'higher_is_worse' },
  { id: 't4l', label: 'T4L', nomesBusca: ["T4 Livre"], ref: { min: 0.8, max: 1.8 } },
  { id: 't3l', label: 'T3L', nomesBusca: ["T3 Livre"], ref: { min: 2.0, max: 4.4 } },
  { id: 't3t', label: 'T3T', nomesBusca: ["T3 Total"], ref: { min: 80, max: 200 } },
  { id: 'atpo', label: 'Anti-TPO', nomesBusca: ["Anti-TPO"], ref: { min: -Infinity, max: 35 } },
  { id: 'atg', label: 'Anti-TG', nomesBusca: ["Anti-Tireoglobulina"], ref: { min: -Infinity, max: 40 } },
  { id: 'vitd', label: 'Vit.D', nomesBusca: ["Vitamina D Total 25 OH", "Vitamina D", "25-hidroxivitamina D", "Vitamina D3", "VD325OH"], ref: { min: 20, max: 50 }, trendMeaning: 'higher_is_better' },
  { id: 'pth', label: 'PTH', nomesBusca: ["Dosagem sérica de PTH - Paratormônio", "PTH", "Paratormonio"], ref: { min: 18.5, max: 88.0 } },
  { id: 'vitb12', label: 'Vit.B12', nomesBusca: ["Vitamina B12", "VB12"], ref: { min: 211, max: 911 } },
  { id: 'afol', label: 'Ac.Fólico', nomesBusca: ["Ácido Fólico", "AFOL"], ref: { min: 5.38, max: Infinity } },
  { id: 'psa', label: 'PSA', nomesBusca: ["PSA", "Antigeno Prostatico Especifico"], ref: { min: -Infinity, max: 4.0 }, trendMeaning: 'higher_is_worse' },
  { id: 'cea', label: 'CEA', nomesBusca: ["CEA", "Antigeno Carcinoembrionario"], ref: { min: -Infinity, max: 5.0 }, trendMeaning: 'higher_is_worse' },
  { id: 'afp', label: 'AFP', nomesBusca: ["Alfa-fetoproteína"], ref: { min: -Infinity, max: 10 }, trendMeaning: 'higher_is_worse' },
  { id: 'ca199', label: 'CA19-9', nomesBusca: ["CA 19-9"], template: (v) => `CA19-9 ${v.replace(/\.(?=.*\d{3},)/g, '')} / `, ref: { min: -Infinity, max: 37 }, trendMeaning: 'higher_is_worse' },
  { id: 'ca125', label: 'CA125', nomesBusca: ["CA 125"], ref: { min: -Infinity, max: 35 }, trendMeaning: 'higher_is_worse' },
  { id: 'ca153', label: 'CA15-3', nomesBusca: ["CA 15-3"], ref: { min: -Infinity, max: 30 }, trendMeaning: 'higher_is_worse' },
  { id: 'bhcg', label: 'Beta-HCG', nomesBusca: ["Beta-HCG"], ref: { min: -Infinity, max: 5 }, trendMeaning: 'higher_is_worse' },
  { id: 'phart', label: 'pHart', nomesBusca: ["PH"], usaTextoArterial: true, ref: { min: 7.35, max: 7.45 } },
  { id: 'po2art', label: 'pO2art', nomesBusca: ["PO2"], usaTextoArterial: true, ref: { min: 80, max: 100 } },
  { id: 'pco2art', label: 'pCO2art', nomesBusca: ["PCO2"], usaTextoArterial: true, ref: { min: 35, max: 40 } },
  { id: 'so2art', label: 'SO2art', nomesBusca: ["Saturacao de O2"], usaTextoArterial: true, ref: { min: 95, max: 100 } },
  { id: 'hco3art', label: 'HCO3art', nomesBusca: ["Bicarbonato"], usaTextoArterial: true, ref: { min: 22, max: 26 } },
  { id: 'beart', label: 'BEart', nomesBusca: ["Base Exces"], usaTextoArterial: true, ref: { min: -2, max: 2 } },
  { id: 'lactart', label: 'Lactart', nomesBusca: ["Lactato Arterial"], ref: { min: 0.5, max: 1.6 }, trendMeaning: 'higher_is_worse' },
  { id: 'phven', label: 'pHven', nomesBusca: ["PH"], usaTextoVenoso: true, ref: { min: 7.31, max: 7.41 } },
  { id: 'po2ven', label: 'pO2ven', nomesBusca: ["PO2"], usaTextoVenoso: true, ref: { min: 30, max: 40 } },
  { id: 'pco2ven', label: 'pCO2ven', nomesBusca: ["PCO2"], usaTextoVenoso: true, ref: { min: 41, max: 51 } },
  { id: 'so2ven', label: 'SO2ven', nomesBusca: ["Saturacao de O2"], usaTextoVenoso: true },
  { id: 'hco3ven', label: 'HCO3ven', nomesBusca: ["Bicarbonato"], usaTextoVenoso: true, ref: { min: 23, max: 29 } },
  { id: 'beven', label: 'BEven', nomesBusca: ["Base Exces"], usaTextoVenoso: true, ref: { min: -2, max: 2 } },
  { id: 'lactven', label: 'Lactven', nomesBusca: ["Lactato"], usaTextoVenoso: true, ref: { min: 0.5, max: 2.2 }, trendMeaning: 'higher_is_worse' },
  {
    id: 'urina1', label: 'Urina I',
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
      const alterados = exame.subExames?.filter(sub => sub.status === 'alterado') || [];
      if (alterados.length === 0) return 'Urina I s/a / ';
      const partesAlteradas = alterados.map(sub => `${sub.label.toUpperCase()} ${sub.value}`);
      return `Urina I (${partesAlteradas.join(', ')}, demais s/a) / `;
    }
  }
];

config.forEach(exame => {
  if (!exame.template) {
    exame.template = (v) => `${exame.label} ${v} / `;
  }
});

export default config;
