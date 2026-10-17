// ── Experiment data for modal content ──
const experimentData = {
  nh4: {
    reaction: 'NH₄⁺ + OH⁻ → NH₃↑ + H₂O',
    steps: [
      'Take the suspected solution in a test tube.',
      'Add excess NaOH solution and gently warm.',
      'Hold moist red litmus paper at the mouth of the test tube.',
      'Observe the color change of the litmus paper.'
    ],
    observation: 'Pungent smell of ammonia gas (NH₃) is released. Moist red litmus paper turns blue.',
    tags: ['Cation Test', 'Qualitative', 'Gas Test', 'NaOH Reagent']
  },
  fe2: {
    reaction: 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓ (dirty green)',
    steps: [
      'Take solution in a test tube. Add NaOH solution.',
      'Observe precipitate color — dirty green confirms Fe²⁺.',
      'In a second test: add K₃[Fe(CN)₆] solution.',
      'Observe the color change in the solution.'
    ],
    observation: 'Dirty green precipitate of Fe(OH)₂. With K₃[Fe(CN)₆] → Turnbull\'s blue color confirms Fe²⁺.',
    tags: ['Cation Test', 'Precipitate', 'NaOH', 'Prussian Blue']
  },
  fe3: {
    reaction: 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ (reddish-brown)',
    steps: [
      'Take the test solution in a test tube.',
      'Add NaOH solution dropwise and observe.',
      'In a separate test: add KSCN (potassium thiocyanate) solution.',
      'Observe the distinctive color change.'
    ],
    observation: 'Reddish-brown precipitate with NaOH. Intense blood-red color with KSCN confirms Fe³⁺.',
    tags: ['Cation Test', 'Precipitate', 'KSCN Reagent', 'Colourimetric']
  },
  cu2: {
    reaction: 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ (pale blue)',
    steps: [
      'Add NaOH solution to the copper(II) solution.',
      'Observe the pale blue precipitate formed.',
      'Add excess concentrated ammonia solution.',
      'Observe the change in the precipitate and solution color.'
    ],
    observation: 'Pale blue Cu(OH)₂ precipitate with NaOH. Dissolves in excess NH₃ to form deep blue [Cu(NH₃)₄]²⁺ complex.',
    tags: ['Cation Test', 'Complex Ion', 'Ammonia Test', 'Color Change']
  },
  zn2: {
    reaction: 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓ → ZnO₂²⁻ (excess NaOH)',
    steps: [
      'Add NaOH solution to the zinc solution.',
      'Observe the white gelatinous precipitate.',
      'Add excess NaOH and observe dissolution.',
      'This amphoteric behavior confirms Zn²⁺.'
    ],
    observation: 'White gelatinous precipitate of Zn(OH)₂. Dissolves in both excess NaOH and excess NH₃ — confirms amphoteric nature.',
    tags: ['Cation Test', 'Amphoteric', 'White Precipitate', 'NaOH']
  },
  pb2: {
    reaction: 'Pb²⁺ + SO₄²⁻ → PbSO₄↓ | Pb²⁺ + 2I⁻ → PbI₂↓ (yellow)',
    steps: [
      'Add dilute H₂SO₄ to the test solution.',
      'Observe the white precipitate of PbSO₄.',
      'For confirmation: add KI solution to a separate sample.',
      'Observe the bright yellow PbI₂ precipitate.'
    ],
    observation: 'White precipitate with H₂SO₄ (insoluble in HNO₃). Bright yellow precipitate with KI confirms Pb²⁺.',
    tags: ['Cation Test', 'Yellow Precipitate', 'KI Test', 'Heavy Metal']
  },
  co3: {
    reaction: 'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑',
    steps: [
      'Add dilute HCl to the solid or solution being tested.',
      'Observe for brisk effervescence of colorless gas.',
      'Pass the gas through limewater (Ca(OH)₂ solution).',
      'Observe the limewater turning milky.'
    ],
    observation: 'Brisk effervescence of CO₂ with dilute acid. Limewater (Ca(OH)₂) turns milky white: CO₂ + Ca(OH)₂ → CaCO₃↓',
    tags: ['Anion Test', 'Gas Test', 'CO₂', 'Limewater']
  },
  so4: {
    reaction: 'Ba²⁺ + SO₄²⁻ → BaSO₄↓ (white, insoluble in HCl)',
    steps: [
      'Acidify the test solution with dilute HCl first.',
      'Add BaCl₂ solution to the acidified solution.',
      'Observe the white precipitate formed.',
      'Test that the precipitate is insoluble in excess HCl.'
    ],
    observation: 'White precipitate of BaSO₄ formed. Insoluble in dilute HCl — this distinguishes it from BaSO₃ (soluble in HCl).',
    tags: ['Anion Test', 'White Precipitate', 'BaCl₂', 'Insoluble']
  },
  cl: {
    reaction: 'Ag⁺ + Cl⁻ → AgCl↓ (white, curdy)',
    steps: [
      'Acidify the solution with dilute HNO₃.',
      'Add AgNO₃ solution and observe.',
      'Note the white curdy precipitate of AgCl.',
      'Add dilute NH₃ — precipitate dissolves (soluble in NH₃).'
    ],
    observation: 'White curdy precipitate of AgCl. Soluble in dilute NH₃ (forms [Ag(NH₃)₂]⁺ complex). Confirms Cl⁻.',
    tags: ['Anion Test', 'Silver Test', 'Curdy Precipitate', 'AgNO₃']
  },
  acetate: {
    reaction: 'CH₃COO⁻ + H⁺ → CH₃COOH↑ (vinegar smell)',
    steps: [
      'Take the test solution in an evaporating dish.',
      'Add dilute H₂SO₄ and warm gently.',
      'Smell the vapour cautiously by wafting.',
      'Characteristic vinegar smell confirms acetate.'
    ],
    observation: 'Characteristic vinegar smell of ethanoic (acetic) acid on warming with dilute H₂SO₄ confirms CH₃COO⁻.',
    tags: ['Anion Test', 'Smell Test', 'Acetic Acid', 'Warming']
  },
  no3: {
    reaction: 'NO₃⁻ + Fe²⁺ + H₂SO₄ → [Fe(NO)]²⁺ (brown ring)',
    steps: [
      'Add fresh FeSO₄ solution to the test solution.',
      'Tilt the test tube carefully.',
      'Add concentrated H₂SO₄ slowly down the side.',
      'Observe the brown ring at the interface of the two layers.'
    ],
    observation: 'A brown ring of [Fe(NO)]²⁺ forms at the junction between the two layers — confirms NO₃⁻. Do NOT shake!',
    tags: ['Anion Test', 'Brown Ring', 'FeSO₄', 'Conc. H₂SO₄', 'Dangerous']
  },
  h2so4: {
    reaction: 'Concentration × Volume = moles → Dilute to 0.1M',
    steps: [
      'Calculate volume needed: C₁V₁ = C₂V₂. For 250mL of 0.1M: V₁ = (0.1 × 250) / conc.',
      'Half-fill volumetric flask with distilled water.',
      'Slowly add measured conc. H₂SO₄ to water (ACID TO WATER).',
      'Cool, make up to 250mL mark, stopper and mix thoroughly.'
    ],
    observation: 'Exothermic process — solution heats up. Always add acid to water. Accurate 0.1M solution for titrations.',
    tags: ['Solution Prep', 'Volumetric', 'Standard Solution', 'Safety Critical']
  },
  titration: {
    reaction: 'HCl + NaOH → NaCl + H₂O | Endpoint: pink → colourless',
    steps: [
      'Fill burette with NaOH. Record initial reading.',
      'Pipette 25.0cm³ HCl into conical flask. Add phenolphthalein.',
      'Titrate slowly — swirl constantly. Slow near endpoint.',
      'Record when one drop turns solution permanently pink.'
    ],
    observation: 'Pink color of phenolphthalein disappears permanently at equivalence point. Average titre used for calculation: C(HCl) = C(NaOH)×V(NaOH)/V(HCl)',
    tags: ['Titration', 'Acid-Base', 'Phenolphthalein', 'Quantitative', 'Burette']
  },
  redox: {
    reaction: '2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂ + 8H₂O',
    steps: [
      'Pipette oxalic acid into conical flask. Add dilute H₂SO₄.',
      'Warm to 60-70°C (NOT boiling) to speed reaction.',
      'Fill burette with KMnO₄ solution. No indicator needed.',
      'Titrate until one drop gives permanent pink/violet — self-indicator.'
    ],
    observation: 'Purple KMnO₄ decolourises as Mn²⁺ (colourless) forms. Endpoint: faint permanent pink. Self-indicating — no indicator needed.',
    tags: ['Redox', 'Self-indicating', 'KMnO₄', 'Oxalic Acid', 'Heat Required']
  },
  heat: {
    reaction: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)  ΔH = -57 kJ/mol',
    steps: [
      'Measure 50cm³ HCl into polystyrene cup. Record temperature T₁.',
      'Measure 50cm³ NaOH. Record temperature T₁ (should be same).',
      'Pour NaOH into HCl quickly. Stir and record max temperature T₂.',
      'Calculate ΔH = -mcΔT × (1000/moles) kJ/mol.'
    ],
    observation: 'Temperature rises by approximately 6-7°C. Theoretical ΔH = -57.3 kJ/mol. Use polystyrene cup to minimize heat loss.',
    tags: ['Calorimetry', 'Exothermic', 'ΔH Calculation', 'Thermometry']
  },
  cuso4: {
    reaction: 'CuSO₄(aq) → evaporate → CuSO₄·5H₂O (blue crystals)',
    steps: [
      'Dissolve excess CuSO₄ in minimum hot distilled water.',
      'Filter while hot to remove insoluble impurities.',
      'Allow filtrate to cool slowly in a clean beaker.',
      'Filter off crystals, wash with cold water, dry between filter paper.'
    ],
    observation: 'Beautiful royal blue crystals of CuSO₄·5H₂O (copper sulphate pentahydrate) form on cooling. Heating above 100°C removes water of crystallisation.',
    tags: ['Crystallisation', 'Hydrate', 'Blue Crystals', 'Slow Cooling']
  },
  nacl: {
    reaction: 'NaCl(aq) → evaporate → NaCl(s) cubic crystals',
    steps: [
      'Dissolve NaCl in warm distilled water to make saturated solution.',
      'Filter to remove any impurities.',
      'Evaporate on water bath until small crystals begin to appear.',
      'Allow to cool. Filter off crystals and dry in oven at low temp.'
    ],
    observation: 'White cubic crystals of NaCl form. Rapid evaporation gives smaller crystals; slow evaporation gives larger, purer cubic crystals.',
    tags: ['Crystallisation', 'Cubic Structure', 'Evaporation', 'Ionic Solid']
  },
  rate1: {
    reaction: 'Na₂S₂O₃ + 2HCl → S↓ + SO₂↑ + 2NaCl + H₂O',
    steps: [
      'Draw a bold X on paper. Place conical flask on top.',
      'Mix Na₂S₂O₃ solution with HCl and start stopwatch.',
      'Stop timing when X is no longer visible from above.',
      'Repeat with different concentrations. Plot 1/t vs concentration.'
    ],
    observation: 'Milky sulfur precipitate forms, obscuring the X mark. Higher concentration → shorter time → faster rate. Rate ∝ [Na₂S₂O₃].',
    tags: ['Rate of Reaction', 'Concentration Effect', 'Precipitation', 'Clock Reaction']
  },
  h2o2: {
    reaction: '2H₂O₂(aq) → 2H₂O(l) + O₂(g) [cat: MnO₂]',
    steps: [
      'Set up gas collection apparatus (water displacement).',
      'Add H₂O₂ solution to flask. Add small amount of MnO₂ catalyst.',
      'Collect O₂ gas and measure volume over time.',
      'Test gas with glowing splint — relights confirms O₂.'
    ],
    observation: 'Rapid effervescence when MnO₂ added. O₂ gas collected — relights a glowing splint. MnO₂ unchanged at end (catalyst).',
    tags: ['Catalysis', 'O₂ Collection', 'Glowing Splint', 'MnO₂ Catalyst']
  },
  alcohol: {
    reaction: '2C₂H₅OH + 2Na → 2C₂H₅ONa + H₂↑',
    steps: [
      'Place a small amount of ethanol in a dry test tube.',
      'Add a small piece of freshly cut sodium metal.',
      'Observe the reaction carefully from a distance.',
      'Test gas produced with a burning splint.'
    ],
    observation: 'Brisk effervescence of H₂ gas. Burns with squeaky pop. Less vigorous than Na in water — confirms -OH group. Exothermic reaction.',
    tags: ['Organic', 'Functional Group', 'Sodium Test', '-OH Group', 'H₂ Gas']
  },
  aldehyde: {
    reaction: 'RCHO + 2[Ag(NH₃)₂]⁺ + 2OH⁻ → RCOO⁻ + 2Ag↓ + 4NH₃',
    steps: [
      'Prepare Tollen\'s reagent: add NH₃ to AgNO₃ until ppt dissolves.',
      'Add a few drops of aldehyde to the reagent in a clean flask.',
      'Warm gently in a water bath (DO NOT boil).',
      'Observe the silver mirror forming on the flask wall.'
    ],
    observation: 'Silver mirror deposits on inner wall of test tube. Aldehydes are oxidised; ketones give NO reaction (distinguishes them).',
    tags: ['Organic', 'Aldehyde', 'Silver Mirror', 'Oxidation', 'Tollen\'s Reagent']
  },
  ketone: {
    reaction: 'CH₃COCH₃ + 3I₂ + 3NaOH → CHI₃↓ + CH₃COONa + 3NaI',
    steps: [
      'Add iodine solution (I₂ in KI) to the ketone sample.',
      'Add NaOH solution and warm gently.',
      'Observe the yellow precipitate forming.',
      'Note the antiseptic smell of iodoform (CHI₃).'
    ],
    observation: 'Yellow precipitate of CHI₃ (iodoform) with characteristic smell. Only methyl ketones (CH₃CO-) give positive test. Acetaldehyde also gives positive result.',
    tags: ['Organic', 'Ketone', 'Iodoform', 'Yellow Precipitate', 'Methyl Ketones']
  },
  carbox: {
    reaction: 'RCOOH + NaHCO₃ → RCOONa + H₂O + CO₂↑',
    steps: [
      'Place the carboxylic acid sample in a test tube.',
      'Add sodium hydrogencarbonate (NaHCO₃) solution.',
      'Observe for effervescence of CO₂ gas.',
      'Test gas with limewater to confirm CO₂.'
    ],
    observation: 'Brisk effervescence of CO₂ with NaHCO₃. This distinguishes -COOH from phenol (phenol does NOT react with NaHCO₃). Limewater turns milky.',
    tags: ['Organic', '-COOH Group', 'NaHCO₃', 'CO₂ Gas', 'Distinguishing Test']
  },
  aldol: {
    reaction: 'CH₃CHO + CH₃CHO → CH₃CH(OH)CH₂CHO (aldol)',
    steps: [
      'Mix two equivalents of acetaldehyde in a flask.',
      'Add dilute NaOH solution as base catalyst and cool.',
      'Observe the formation of the β-hydroxy aldehyde (aldol product).',
      'Gently warm to dehydrate → crotonaldehyde (aldol condensation).'
    ],
    observation: 'Aldol product (3-hydroxybutanal) forms in cold. On warming, dehydration gives α,β-unsaturated carbonyl (crotonaldehyde). Classic C–C bond forming reaction.',
    tags: ['Named Reaction', 'Organic', 'Condensation', 'C–C Bond', 'NaOH Catalyst']
  },
  cannizzaro: {
    reaction: '2HCHO + NaOH → CH₃OH + HCOONa',
    steps: [
      'Take formaldehyde (no α-hydrogen) in a flask.',
      'Add concentrated NaOH solution.',
      'Observe that one molecule is oxidised and one reduced.',
      'Products are methanol and sodium formate — no external oxidant needed.'
    ],
    observation: 'Disproportionation reaction: one aldehyde acts as oxidising agent, one as reducing agent. Characteristic of aldehydes with no α-H (HCHO, PhCHO).',
    tags: ['Named Reaction', 'Cannizzaro', 'Disproportionation', 'No α-H', 'Redox']
  },
  grignard: {
    reaction: 'R–MgX + R′CHO → R–CH(OH)–R′ (after H₃O⁺)',
    steps: [
      'Prepare Grignard reagent: Mg turnings + alkyl halide in dry ether.',
      'Add anhydrous carbonyl compound (aldehyde/ketone) to Grignard in ether.',
      'Stir under dry nitrogen — strictly anhydrous conditions.',
      'Work up with dilute H₃O⁺ → alcohol product.'
    ],
    observation: 'Powerful C–C bond formation. Primary alcohol from HCHO, secondary from RCHO, tertiary from ketones or excess. Must exclude moisture — water destroys Grignard reagent.',
    tags: ['Named Reaction', 'Grignard', 'Organomagnesium', 'Anhydrous', 'C–C Bond']
  },
  lucas: {
    reaction: 'ROH + HCl → RCl + H₂O  (ZnCl₂ catalyst)',
    steps: [
      'Prepare Lucas reagent: conc. HCl + anhydrous ZnCl₂.',
      'Add a few drops of unknown alcohol to the reagent at room temperature.',
      'Observe turbidity or layer separation and note the time taken.',
      '3° alcohol: instant cloudiness; 2°: within 5 min; 1°: no reaction (cold).'
    ],
    observation: 'Turbidity due to insoluble alkyl chloride. Rate: 3° > 2° > 1°. Used to distinguish primary, secondary, and tertiary alcohols. Works below 6 carbons only.',
    tags: ['Named Reaction', 'Lucas Test', 'Alcohol Class', 'ZnCl₂', 'Qualitative']
  },
  fehling: {
    reaction: 'RCHO + 2Cu²⁺ → RCOOH + Cu₂O↓ (brick-red)',
    steps: [
      'Mix equal volumes of Fehling\'s A (CuSO₄) and Fehling\'s B (NaOH + sodium potassium tartrate).',
      'Add the aldehyde or sugar sample to the deep blue Fehling\'s solution.',
      'Heat in a boiling water bath for 2–3 minutes.',
      'Observe brick-red precipitate of Cu₂O confirming reducing sugar/aldehyde.'
    ],
    observation: 'Brick-red Cu₂O precipitate forms. Aldehydes and reducing sugars test positive. Ketones (except α-hydroxy ketones) test negative. Distinguishes glucose from fructose vs. sucrose.',
    tags: ['Named Reaction', 'Fehling\'s Test', 'Reducing Sugar', 'Cu₂O', 'Brick-red']
  },
  baeyer: {
    reaction: 'Alkene + KMnO₄(aq, cold, dil.) → diol (purple → colourless)',
    steps: [
      'Take cold, dilute, neutral KMnO₄ solution (purple).',
      'Add the alkene or unsaturated compound.',
      'Shake — observe decolourisation of the purple KMnO₄.',
      'MnO₂ (brown) ppt also forms. Indicates C=C double bond.'
    ],
    observation: 'Purple colour of KMnO₄ discharged → forms colourless diol + MnO₂. This is Baeyer\'s test for unsaturation. Hot conc. KMnO₄ causes oxidative cleavage instead.',
    tags: ['Named Reaction', 'Baeyer\'s Test', 'Unsaturation', 'KMnO₄', 'Diol Formation']
  },
  friedel_crafts: {
    reaction: 'C₆H₆ + RCl → C₆H₅R + HCl  (AlCl₃ catalyst)',
    steps: [
      'Take dry benzene and add anhydrous AlCl₃ (Lewis acid catalyst).',
      'Add the alkyl halide (e.g. CH₃Cl) or acyl halide dropwise with stirring.',
      'AlCl₃ generates carbocation R⁺ which attacks the benzene ring.',
      'HCl is released as electrophilic substitution completes.'
    ],
    observation: 'Alkyl or acyl group substituted onto benzene ring. Alkylation produces alkylbenzene; acylation produces aryl ketone. Anhydrous conditions essential — moisture destroys AlCl₃.',
    tags: ['Named Reaction', 'Friedel-Crafts', 'EAS', 'AlCl₃', 'Benzene']
  },
  diels_alder: {
    reaction: 'Diene + dienophile → cyclohexene derivative (cycloaddition)',
    steps: [
      'Mix a conjugated diene (e.g. butadiene) with a dienophile (e.g. maleic anhydride).',
      'Heat gently — or react at room temperature with reactive dienophiles.',
      'The s-cis diene and electron-poor dienophile react in a [4+2] concerted step.',
      'Product is a six-membered ring — single stereochemical step with no intermediates.'
    ],
    observation: 'Six-membered carbocyclic ring formed in one step. Stereospecific — syn addition. Electron-withdrawing groups on dienophile accelerate the reaction. Cornerstone of ring synthesis.',
    tags: ['Named Reaction', 'Diels-Alder', 'Cycloaddition', '[4+2]', 'Stereospecific']
  },
  sandmeyer: {
    reaction: 'ArN₂⁺ + CuX → ArX + N₂↑  (X = Cl, Br, CN)',
    steps: [
      'Diazotise a primary aromatic amine: ArNH₂ + NaNO₂ + HCl at 0–5°C.',
      'Add the diazonium salt to CuCl or CuBr (Sandmeyer\'s reagent).',
      'Warm gently — N₂ gas is evolved and the aryl halide forms.',
      'Separate the aryl halide by steam distillation.'
    ],
    observation: 'N₂ gas evolved (effervescence). Aryl halide (ArCl, ArBr, ArCN) obtained. Extremely useful for introducing halogens or CN directly onto a benzene ring with regiochemical precision.',
    tags: ['Named Reaction', 'Sandmeyer', 'Diazonium', 'Aryl Halide', 'N₂ evolved']
  },
  hofmann: {
    reaction: 'RCONH₂ + Br₂ + 4NaOH → RNH₂ + Na₂CO₃ + 2NaBr + 2H₂O',
    steps: [
      'Take the primary amide in an alkaline solution.',
      'Add bromine water and excess NaOH (or NaOBr solution).',
      'Warm gently — observe evolution of the amine.',
      'Product amine has one carbon fewer than the original amide.'
    ],
    observation: 'Rearrangement reaction — carbon chain decreases by one. Isocyanate intermediate formed. Used to convert carboxamides to primary amines with shorter chains. Hofmann degradation.',
    tags: ['Named Reaction', 'Hofmann Degradation', 'Rearrangement', 'Amide→Amine', 'Chain Shortening']
  },
  na2co3: {
    reaction: 'Na₂CO₃ + HCl → NaHCO₃ + NaCl | NaHCO₃ + HCl → NaCl + H₂O + CO₂',
    steps: [
      'Dissolve weighed Na₂CO₃ in 250cm³ volumetric flask.',
      'Titrate with standard HCl using phenolphthalein (1st endpoint).',
      'Continue titrating with methyl orange (2nd endpoint).',
      'Use titre values to calculate Na₂CO₃ concentration.'
    ],
    observation: 'Two endpoints observed (double indicator method). 1st endpoint (phenolphthalein): CO₃²⁻ → HCO₃⁻. 2nd (methyl orange): HCO₃⁻ → CO₂.',
    tags: ['Advanced', 'Double Indicator', 'Quantitative', 'Two Endpoints']
  },
  distill: {
    reaction: 'Mixture → Heat → Vapour → Condenser → Pure liquid fractions',
    steps: [
      'Set up distillation apparatus: flask, thermometer, condenser, receiver.',
      'Add mixture and anti-bumping granules to flask.',
      'Heat gently. Collect fractions at specific temperature ranges.',
      'Record boiling points — each pure compound has a fixed boiling point.'
    ],
    observation: 'Components separate based on boiling point differences. Thermometer reads boiling point of current distillate. Used to purify liquids and separate miscible mixtures.',
    tags: ['Advanced', 'Separation', 'Boiling Point', 'Purification', 'Fractions']
  }
};

// ── Rotating hero reactions ──
const reactions = [
  'NaOH + HCl → NaCl + H₂O',
  'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓',
  'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺',
  'Ag⁺ + Cl⁻ → AgCl↓',
  'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑',
  'Ba²⁺ + SO₄²⁻ → BaSO₄↓',
  '2H₂O₂ → 2H₂O + O₂↑',
  'RCHO + 2[Ag(NH₃)₂]⁺ → Ag↓',
];
let reactionIndex = 0;

function rotateReaction() {
  const el = document.getElementById('heroReaction');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    reactionIndex = (reactionIndex + 1) % reactions.length;
    el.textContent = reactions[reactionIndex];
    el.style.opacity = '1';
  }, 400);
}
setInterval(rotateReaction, 3000);

// ── Filter state ──
let activeSection = 'ALL';

function setSection(section, btn) {
  activeSection = section;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterExperiments();
}

function filterExperiments() {
  const query = document.getElementById('labSearch').value.toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll('.exp-section').forEach(section => {
    const sectionKey = section.dataset.section;
    const sectionMatch = activeSection === 'ALL' || sectionKey === activeSection;

    if (!sectionMatch && !query) {
      section.classList.add('hidden');
      return;
    }

    let sectionHasVisible = false;

    section.querySelectorAll('.exp-card').forEach(card => {
      const name = card.dataset.name?.toLowerCase() || '';
      const cardSection = card.dataset.section || '';
      const sectionOk = activeSection === 'ALL' || cardSection === activeSection;
      const searchOk  = !query || name.includes(query);

      if (sectionOk && searchOk) {
        card.style.display = 'flex';
        sectionHasVisible = true;
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    section.classList.toggle('hidden', !sectionHasVisible);
  });

  document.getElementById('expCount').textContent =
    `Showing ${visibleCount} experiment${visibleCount !== 1 ? 's' : ''}`;
}

// ── Launch experiment modal ──
function launchExperiment(name, key) {
  const data = experimentData[key];
  const overlay = document.getElementById('modalOverlay');
  const title   = document.getElementById('modalTitle');
  const body    = document.getElementById('modalBody');

  title.textContent = name;

  if (!data) {
    body.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">Detailed simulation coming soon for this experiment.</p>`;
  } else {
    body.innerHTML = `
      <div class="modal-section">
        <div class="modal-section-title">Chemical Equation</div>
        <div class="modal-reaction-box">${data.reaction}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Procedure</div>
        <div class="modal-steps">
          ${data.steps.map((s, i) => `
            <div class="modal-step">
              <div class="step-num">${i + 1}</div>
              <div class="step-text">${s}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Observation &amp; Result</div>
        <div class="modal-obs">${data.observation}</div>
      </div>

      <div class="modal-tags">
        ${data.tags.map(t => `<span class="modal-tag">${t}</span>`).join('')}
      </div>
    `;
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Stagger card animations on load
document.querySelectorAll('.exp-card').forEach((card, i) => {
  card.style.animationDelay = `${i * 0.04}s`;
});

// Initial count
document.getElementById('expCount').textContent = 'Showing 24 experiments';

// ========== VOICE CONTROL & ANIMATION SYSTEM ==========
let synth = window.speechSynthesis;
let currentUtterance = null;
let toastTimeout = null;

function showToast(msg, duration=2500){
  let toast = document.getElementById('voiceToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'voiceToast';
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e2a2e;color:#c6f7e5;padding:10px 20px;border-radius:40px;font-size:0.85rem;z-index:2000;backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.3);border-left:3px solid #4fd1c5;font-weight:500;transition:opacity 0.2s;opacity:0;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  if(toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>{ if(toast) toast.style.opacity = '0'; }, duration);
}

function hideToast(){
  const toast = document.getElementById('voiceToast');
  if(toast) toast.style.opacity = '0';
  if(toastTimeout) clearTimeout(toastTimeout);
}

function speak(text, onEnd){
  if(currentUtterance){
    synth.cancel();
    currentUtterance = null;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.lang = 'en-US';
  utterance.onend = () => {
    currentUtterance = null;
    if(onEnd) onEnd();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    if(onEnd) onEnd();
  };
  currentUtterance = utterance;
  synth.speak(utterance);
}

// ---------- Animation Control ----------
let currentAnimationInterval = null;
let currentBeaker = null;
let currentStepDisplay = null;
let currentReagents = [];

function stopAnimation(){
  if(currentAnimationInterval){
    clearInterval(currentAnimationInterval);
    currentAnimationInterval = null;
  }
  // reset visual state of beaker content if needed
  if(currentBeaker){
    currentBeaker.style.background = 'rgba(30, 40, 35, 0.6)';
    currentBeaker.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)';
    const bubbles = currentBeaker.querySelectorAll('.bubble');
    bubbles.forEach(b => b.remove());
  }
}

function resetLab(){
  const labArea = document.getElementById('labAnimationArea');
  if(labArea) labArea.innerHTML = '<div class="lab-empty">Ready. Say an experiment name.</div>';
  stopAnimation();
  currentBeaker = null;
  currentStepDisplay = null;
}

function addReagentToBeaker(reagent, color, type){
  if(!currentBeaker) return;
  const effect = document.createElement('div');
  effect.className = `reagent-effect ${type}`;
  effect.textContent = reagent;
  effect.style.position = 'absolute';
  effect.style.bottom = '30%';
  effect.style.left = '50%';
  effect.style.transform = 'translateX(-50%)';
  effect.style.fontSize = '1rem';
  effect.style.fontWeight = 'bold';
  effect.style.whiteSpace = 'nowrap';
  effect.style.padding = '4px 12px';
  effect.style.borderRadius = '20px';
  effect.style.background = color;
  effect.style.color = '#fff';
  effect.style.textShadow = '0 0 2px black';
  effect.style.zIndex = '15';
  effect.style.animation = 'fadeUpOut 1.2s forwards';
  currentBeaker.appendChild(effect);
  // Also change beaker liquid tint temporarily
  currentBeaker.style.background = `linear-gradient(135deg, ${color}40, ${color}20)`;
  setTimeout(() => {
    if(currentBeaker) currentBeaker.style.background = 'rgba(30, 40, 35, 0.6)';
  }, 800);
}

function autoRunExperiment(exp){
  if(currentAnimationInterval){
    clearInterval(currentAnimationInterval);
    currentAnimationInterval = null;
  }
  if(!exp || !exp.reagents) return;
  let i = 0;
  const reagents = exp.reagents;
  function runStep(){
    if(i >= reagents.length){
      if(currentStepDisplay){
        const finalMsg = document.createElement('div');
        finalMsg.className = 'step-message';
        finalMsg.textContent = '✅ Experiment complete.';
        finalMsg.style.color = '#4fd1c5';
        currentStepDisplay.appendChild(finalMsg);
        setTimeout(() => finalMsg.remove(), 3000);
      }
      // Trigger guided session check if a session is active
      if(SESSION.active) setTimeout(runGuidedSession, 1500);
      return;
    }
    const r = reagents[i];
    addReagentToBeaker(r.name, r.color, r.type);
    if(currentStepDisplay){
      const stepDiv = document.createElement('div');
      stepDiv.className = 'step-message';
      stepDiv.textContent = `→ Adding ${r.name}`;
      currentStepDisplay.appendChild(stepDiv);
      stepDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => stepDiv.remove(), 2200);
    }
    i++;
    currentAnimationInterval = setTimeout(runStep, (exp.delay || 1500));
  }
  runStep();
}

function openLab(name, key){
  const labArea = document.getElementById('labAnimationArea');
  if(!labArea) return;
  const exp = EXP[key];
  if(!exp){
    labArea.innerHTML = `<div class="lab-error">⚠️ Simulation for ${name} not yet available.</div>`;
    return;
  }
  labArea.innerHTML = `
    <div class="lab-card">
      <div class="exp-title">${name}</div>
      <div class="beaker-container">
        <div class="beaker" id="dynamicBeaker">
          <div class="liquid"></div>
          <div class="beaker-label"></div>
        </div>
      </div>
      <div class="reagents-panel" id="reagentsPanel">
        ${exp.reagents.map(r => `<div class="reagent-item" data-reagent='${JSON.stringify(r)}'>${r.name}</div>`).join('')}
      </div>
      <div class="steps-panel" id="stepsPanel">
        <div class="steps-title">🧪 Procedure Steps</div>
        <div class="steps-list" id="dynamicSteps"></div>
      </div>
      <button class="run-btn" id="runExpBtn">▶ Run Experiment</button>
    </div>
  `;
  currentBeaker = document.getElementById('dynamicBeaker');
  currentStepDisplay = document.getElementById('dynamicSteps');
  if(currentStepDisplay){
    exp.steps.forEach(step => {
      const p = document.createElement('div');
      p.className = 'step-placeholder';
      p.textContent = step;
      p.style.opacity = '0.7';
      p.style.margin = '4px 0';
      p.style.fontSize = '0.85rem';
      currentStepDisplay.appendChild(p);
    });
  }
  const runBtn = document.getElementById('runExpBtn');
  if(runBtn){
    runBtn.onclick = () => {
      if(currentAnimationInterval){
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
      if(currentStepDisplay){
        Array.from(currentStepDisplay.children).forEach(child => {
          if(child.classList.contains('step-message')) child.remove();
        });
      }
      autoRunExperiment(exp);
    };
  }
  // attach click handlers to reagent items
  document.querySelectorAll('.reagent-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const rdata = JSON.parse(el.dataset.reagent);
      addReagentToBeaker(rdata.name, rdata.color, rdata.type);
      if(currentStepDisplay){
        const manualStep = document.createElement('div');
        manualStep.className = 'step-message';
        manualStep.textContent = `🧪 Manually added ${rdata.name}`;
        currentStepDisplay.appendChild(manualStep);
        setTimeout(() => manualStep.remove(), 2000);
      }
    });
  });
}

// --- Experiment Definitions for Animation ---
const EXP = {
  nh4: {
    reagents: [
      { name: 'NH₄⁺ Solution', color: '#88aaff', type: 'liquid' },
      { name: 'NaOH (excess)', color: '#aaccff', type: 'liquid' },
      { name: 'Warm gently', color: '#ffaa66', type: 'heat' },
      { name: 'Red litmus (moist)', color: '#ff8888', type: 'indicator' }
    ],
    steps: [
      'Take the suspected solution in a test tube.',
      'Add excess NaOH solution and gently warm.',
      'Hold moist red litmus paper at the mouth.',
      'Observe blue color change — ammonia gas confirmed.'
    ],
    delay: 1800
  },
  fe2: {
    reagents: [
      { name: 'Fe²⁺ Solution', color: '#88cc88', type: 'liquid' },
      { name: 'NaOH solution', color: '#aaffaa', type: 'liquid' },
      { name: 'Dirty green ppt', color: '#8f9e6b', type: 'solid' }
    ],
    steps: [
      'Take Fe²⁺ solution in a test tube.',
      'Add NaOH solution dropwise.',
      'Observe dirty green precipitate — Fe(OH)₂ formed.',
      'Secondary test: add K₃[Fe(CN)₆] → Turnbull\'s blue.'
    ],
    delay: 1800
  },
  fe3: {
    reagents: [
      { name: 'Fe³⁺ Solution', color: '#cc8844', type: 'liquid' },
      { name: 'NaOH solution', color: '#aaffaa', type: 'liquid' },
      { name: 'Reddish-brown ppt', color: '#b85c1a', type: 'solid' }
    ],
    steps: [
      'Take Fe³⁺ solution.',
      'Add NaOH dropwise.',
      'Observe reddish-brown precipitate of Fe(OH)₃.',
      'Separate test with KSCN gives blood-red color.'
    ],
    delay: 1800
  },
  cu2: {
    reagents: [
      { name: 'Cu²⁺ Solution', color: '#44aaff', type: 'liquid' },
      { name: 'NaOH solution', color: '#aaffaa', type: 'liquid' },
      { name: 'Pale blue ppt', color: '#88ccff', type: 'solid' },
      { name: 'Conc. NH₃', color: '#cceeff', type: 'liquid' },
      { name: 'Deep blue complex', color: '#2266cc', type: 'liquid' }
    ],
    steps: [
      'Add NaOH to Cu²⁺ solution — pale blue precipitate.',
      'Add excess concentrated ammonia.',
      'Precipitate dissolves forming deep blue [Cu(NH₃)₄]²⁺.',
      'Complex ion confirms copper(II).'
    ],
    delay: 1600
  },
  zn2: {
    reagents: [
      { name: 'Zn²⁺ Solution', color: '#eeeeee', type: 'liquid' },
      { name: 'NaOH (drops)', color: '#aaffaa', type: 'liquid' },
      { name: 'White gelatinous ppt', color: '#f0f0f0', type: 'solid' },
      { name: 'Excess NaOH', color: '#aaffaa', type: 'liquid' },
      { name: 'Dissolved (zincate)', color: '#ddeeff', type: 'liquid' }
    ],
    steps: [
      'Add NaOH to Zn²⁺ solution — white gelatinous Zn(OH)₂.',
      'Add excess NaOH — precipitate dissolves.',
      'Also soluble in excess NH₃ — amphoteric.',
      'Confirms presence of Zn²⁺.'
    ],
    delay: 1700
  },
  pb2: {
    reagents: [
      { name: 'Pb²⁺ Solution', color: '#ddeeff', type: 'liquid' },
      { name: 'Dil. H₂SO₄', color: '#ffdd99', type: 'liquid' },
      { name: 'White PbSO₄ ppt', color: '#ffffff', type: 'solid' },
      { name: 'KI solution', color: '#ffffaa', type: 'liquid' },
      { name: 'Yellow PbI₂ ppt', color: '#ffdd55', type: 'solid' }
    ],
    steps: [
      'Add dilute H₂SO₄ — white precipitate of PbSO₄.',
      'Insoluble in HNO₃ — confirmatory test.',
      'Add KI solution to fresh sample.',
      'Bright yellow PbI₂ precipitate confirms Pb²⁺.'
    ],
    delay: 1700
  },
  co3: {
    reagents: [
      { name: 'Carbonate solid/solution', color: '#eeeecc', type: 'solid' },
      { name: 'Dilute HCl', color: '#ffcc99', type: 'liquid' },
      { name: 'CO₂ gas (effervescence)', color: '#ccccdd', type: 'gas' },
      { name: 'Limewater', color: '#ffffdd', type: 'liquid' },
      { name: 'Milky CaCO₃', color: '#eedd99', type: 'solid' }
    ],
    steps: [
      'Add dilute HCl to carbonate — brisk effervescence.',
      'Pass gas through limewater.',
      'Limewater turns milky due to CaCO₃.',
      'Confirms carbonate ion.'
    ],
    delay: 1700
  },
  so4: {
    reagents: [
      { name: 'Sulfate solution', color: '#ddeeff', type: 'liquid' },
      { name: 'Dilute HCl', color: '#ffcc99', type: 'liquid' },
      { name: 'BaCl₂ solution', color: '#cceeff', type: 'liquid' },
      { name: 'White BaSO₄ ppt', color: '#ffffff', type: 'solid' }
    ],
    steps: [
      'Acidify sulfate solution with dilute HCl.',
      'Add BaCl₂ solution.',
      'White precipitate forms — BaSO₄.',
      'Precipitate is insoluble in excess HCl — confirms SO₄²⁻.'
    ],
    delay: 1700
  },
  cl: {
    reagents: [
      { name: 'Chloride solution', color: '#ddeeff', type: 'liquid' },
      { name: 'Dilute HNO₃', color: '#ffcc99', type: 'liquid' },
      { name: 'AgNO₃ solution', color: '#ccddff', type: 'liquid' },
      { name: 'White curdy AgCl', color: '#f8f8fa', type: 'solid' },
      { name: 'Dilute NH₃', color: '#ccf0f0', type: 'liquid' },
      { name: 'Dissolved complex', color: '#b0e0e6', type: 'liquid' }
    ],
    steps: [
      'Acidify with dilute HNO₃.',
      'Add AgNO₃ — white curdy precipitate of AgCl.',
      'Add dilute NH₃ — precipitate dissolves.',
      'Confirms chloride ion.'
    ],
    delay: 1800
  },
  acetate: {
    reagents: [
      { name: 'Acetate solution', color: '#ffeebb', type: 'liquid' },
      { name: 'Dilute H₂SO₄', color: '#ffcc99', type: 'liquid' },
      { name: 'Warm gently', color: '#ffaa66', type: 'heat' },
      { name: 'Vinegar smell', color: '#ddccaa', type: 'gas' }
    ],
    steps: [
      'Take acetate solution in evaporating dish.',
      'Add dilute H₂SO₄ and warm gently.',
      'Waft vapour — characteristic vinegar smell.',
      'Confirms acetate ion.'
    ],
    delay: 1700
  },
  no3: {
    reagents: [
      { name: 'Nitrate solution', color: '#ddeeff', type: 'liquid' },
      { name: 'Fresh FeSO₄ solution', color: '#ccffcc', type: 'liquid' },
      { name: 'Conc. H₂SO₄', color: '#dd8866', type: 'liquid' },
      { name: 'Brown ring complex', color: '#aa6644', type: 'solid' }
    ],
    steps: [
      'Add fresh FeSO₄ to nitrate solution.',
      'Tilt tube and carefully add conc. H₂SO₄ down side.',
      'Brown ring forms at interface — [Fe(NO)]²⁺.',
      'Do NOT shake! Confirms NO₃⁻.'
    ],
    delay: 2000
  },
  titration: {
    reagents: [
      { name: 'Burette: NaOH', color: '#ffccdd', type: 'liquid' },
      { name: 'Conical flask: HCl + phenolphthalein', color: '#ffe0f0', type: 'liquid' },
      { name: 'Pink color appears', color: '#ff88aa', type: 'indicator' },
      { name: 'Endpoint reached', color: '#ffffff', type: 'indicator' }
    ],
    steps: [
      'Fill burette with NaOH. Record initial reading.',
      'Pipette 25.0 cm³ HCl into flask, add phenolphthalein.',
      'Titrate until pink color persists.',
      'Record final volume. Calculate concentration.'
    ],
    delay: 1600
  },
  redox: {
    reagents: [
      { name: 'Oxalic acid + H₂SO₄', color: '#eeffcc', type: 'liquid' },
      { name: 'KMnO₄ (purple)', color: '#cc88ff', type: 'liquid' },
      { name: 'Decolourisation', color: '#ddddff', type: 'liquid' },
      { name: 'Permanent pink endpoint', color: '#ffaacc', type: 'indicator' }
    ],
    steps: [
      'Pipette oxalic acid, add H₂SO₄, warm to 60-70°C.',
      'Fill burette with KMnO₄ — no indicator needed.',
      'Titrate until one drop gives permanent pink.',
      'Reaction: 2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ + 10CO₂ + 8H₂O.'
    ],
    delay: 1700
  },
  heat: {
    reagents: [
      { name: 'HCl (50 cm³)', color: '#ffcccc', type: 'liquid' },
      { name: 'NaOH (50 cm³)', color: '#ccffcc', type: 'liquid' },
      { name: 'Mix quickly', color: '#ffffaa', type: 'liquid' },
      { name: 'Temperature rise (~6-7°C)', color: '#ff8866', type: 'heat' }
    ],
    steps: [
      'Measure HCl into polystyrene cup, record T₁.',
      'Measure NaOH at same T₁.',
      'Pour and stir, record max T₂.',
      'Calculate ΔH = -mcΔT × (1000/moles) kJ/mol.'
    ],
    delay: 1700
  },
  rate1: {
    reagents: [
      { name: 'Na₂S₂O₃ solution', color: '#ddeeff', type: 'liquid' },
      { name: 'HCl solution', color: '#ffcccc', type: 'liquid' },
      { name: 'Sulfur precipitate (milky)', color: '#ffffcc', type: 'solid' },
      { name: 'X mark disappears', color: '#ccccaa', type: 'indicator' }
    ],
    steps: [
      'Draw X on paper, place flask on it.',
      'Mix Na₂S₂O₃ and HCl, start stopwatch.',
      'Stop when X is no longer visible.',
      'Repeat with concentrations — plot 1/t vs [Na₂S₂O₃].'
    ],
    delay: 1700
  },
  h2o2: {
    reagents: [
      { name: 'H₂O₂ solution', color: '#ddeeff', type: 'liquid' },
      { name: 'MnO₂ catalyst', color: '#886633', type: 'solid' },
      { name: 'O₂ gas bubbles', color: '#cceeff', type: 'gas' },
      { name: 'Glowing splint relights', color: '#ffaa66', type: 'test' }
    ],
    steps: [
      'Set up gas collection with water displacement.',
      'Add H₂O₂ to flask, add MnO₂ catalyst.',
      'Collect O₂ gas, test with glowing splint.',
      'Splint relights — confirms oxygen.'
    ],
    delay: 1700
  },
  alcohol: {
    reagents: [
      { name: 'Ethanol (dry)', color: '#ddeeff', type: 'liquid' },
      { name: 'Sodium metal', color: '#cccccc', type: 'solid' },
      { name: 'H₂ gas (bubbles)', color: '#ffffff', type: 'gas' },
      { name: 'Squeaky pop test', color: '#ffcc88', type: 'test' }
    ],
    steps: [
      'Place ethanol in dry test tube.',
      'Add small piece of freshly cut sodium.',
      'Brisk effervescence — H₂ gas evolved.',
      'Burning splint — squeaky pop confirms H₂.'
    ],
    delay: 1800
  },
  aldehyde: {
    reagents: [
      { name: 'Aldehyde sample', color: '#fff0cc', type: 'liquid' },
      { name: 'Tollen\'s reagent', color: '#aabbcc', type: 'liquid' },
      { name: 'Warm gently', color: '#ffaa66', type: 'heat' },
      { name: 'Silver mirror', color: '#ccccdd', type: 'solid' }
    ],
    steps: [
      'Prepare Tollen\'s reagent (AgNO₃ + NH₃).',
      'Add aldehyde, warm in water bath.',
      'Silver mirror deposits on glass.',
      'Aldehyde oxidised — ketones give no reaction.'
    ],
    delay: 1800
  },
  ketone: {
    reagents: [
      { name: 'Ketone sample', color: '#fff0cc', type: 'liquid' },
      { name: 'Iodine solution (I₂/KI)', color: '#aa8866', type: 'liquid' },
      { name: 'NaOH solution', color: '#aaffaa', type: 'liquid' },
      { name: 'Yellow iodoform ppt', color: '#ffdd88', type: 'solid' }
    ],
    steps: [
      'Add iodine solution to ketone.',
      'Add NaOH and warm gently.',
      'Yellow precipitate of CHI₃ forms.',
      'Antiseptic smell — confirms methyl ketone.'
    ],
    delay: 1800
  },
  carbox: {
    reagents: [
      { name: 'Carboxylic acid', color: '#ffeebb', type: 'liquid' },
      { name: 'NaHCO₃ solution', color: '#ddeeff', type: 'liquid' },
      { name: 'CO₂ effervescence', color: '#ccccdd', type: 'gas' },
      { name: 'Limewater turns milky', color: '#ffffcc', type: 'solid' }
    ],
    steps: [
      'Add NaHCO₃ to carboxylic acid.',
      'Brisk effervescence of CO₂ gas.',
      'Test gas with limewater — turns milky.',
      'Phenols do not react — distinguishes -COOH group.'
    ],
    delay: 1700
  },
  na2co3: {
    reagents: [
      { name: 'Na₂CO₃ solution', color: '#ddeeff', type: 'liquid' },
      { name: 'HCl (burette)', color: '#ffcccc', type: 'liquid' },
      { name: 'Phenolphthalein endpoint', color: '#ff88aa', type: 'indicator' },
      { name: 'Methyl orange endpoint', color: '#ffaa44', type: 'indicator' }
    ],
    steps: [
      'Titrate Na₂CO₃ with HCl, phenolphthalein (1st endpoint: CO₃²⁻ → HCO₃⁻).',
      'Continue with methyl orange (2nd endpoint: HCO₃⁻ → CO₂).',
      'Two endpoints — double indicator method.',
      'Calculate concentrations using both titre values.'
    ],
    delay: 1900
  },
  distill: {
    reagents: [
      { name: 'Liquid mixture', color: '#ddeeff', type: 'liquid' },
      { name: 'Heat applied', color: '#ffaa66', type: 'heat' },
      { name: 'Vapour rises', color: '#eeeeff', type: 'gas' },
      { name: 'Condenser cools', color: '#88ccff', type: 'liquid' },
      { name: 'Pure fraction collected', color: '#cceeff', type: 'liquid' }
    ],
    steps: [
      'Set up distillation apparatus with thermometer.',
      'Add anti-bumping granules to flask.',
      'Heat gently, collect fractions at specific temperatures.',
      'Pure compound has fixed boiling point.'
    ],
    delay: 1800
  }
};

// ========== VOICE COMMAND SYSTEM ==========
const VOICE_MAP = [
  { keys: ['nh4', 'ammonium', 'nh4+', 'ammonium ion', 'ammonium test'], name: 'Ammonium Ion Test', key: 'nh4' },
  { keys: ['fe2', 'iron ii', 'iron 2', 'ferrous', 'fe2+ test', 'iron two'], name: 'Iron(II) Test', key: 'fe2' },
  { keys: ['fe3', 'iron iii', 'iron 3', 'ferric', 'fe3+ test', 'iron three'], name: 'Iron(III) Test', key: 'fe3' },
  { keys: ['cu2', 'copper ii', 'copper 2', 'copper two', 'cu2+ test', 'copper ion test'], name: 'Copper(II) Test', key: 'cu2' },
  { keys: ['zn2', 'zinc', 'zinc ion', 'zn2+ test'], name: 'Zinc Ion Test', key: 'zn2' },
  { keys: ['pb2', 'lead', 'lead ii', 'lead 2', 'lead two', 'pb2+ test'], name: 'Lead(II) Test', key: 'pb2' },
  { keys: ['co3', 'carbonate', 'carbonate ion', 'co3 2-', 'carbonate test'], name: 'Carbonate Test', key: 'co3' },
  { keys: ['so4', 'sulfate', 'sulfate ion', 'so4 2-', 'sulfate test', 'barium chloride test'], name: 'Sulfate Test', key: 'so4' },
  { keys: ['cl', 'chloride', 'chloride ion', 'chloride test', 'silver nitrate test'], name: 'Chloride Test', key: 'cl' },
  { keys: ['acetate', 'acetate ion', 'acetate test', 'ch3coo-'], name: 'Acetate Test', key: 'acetate' },
  { keys: ['no3', 'nitrate', 'nitrate ion', 'nitrate test', 'brown ring test'], name: 'Nitrate Test', key: 'no3' },
  { keys: ['titration', 'acid base titration', 'titration experiment', 'titration'], name: 'Acid-Base Titration', key: 'titration' },
  { keys: ['redox titration', 'permanganate titration', 'kmno4 titration', 'oxalic acid titration'], name: 'Redox Titration', key: 'redox' },
  { keys: ['enthalpy', 'heat of neutralisation', 'calorimetry experiment', 'heat experiment', 'heat of reaction'], name: 'Enthalpy of Neutralisation', key: 'heat' },
  { keys: ['rate of reaction', 'kinetics', 'thiosulfate reaction', 'rate experiment', 'clock reaction'], name: 'Rate of Reaction (Sulfur Clock)', key: 'rate1' },
  { keys: ['hydrogen peroxide', 'h2o2 decomposition', 'oxygen gas preparation', 'catalyst experiment', 'manganese dioxide'], name: 'Hydrogen Peroxide Decomposition', key: 'h2o2' },
  { keys: ['alcohol test', 'ethanol sodium test', 'oh group test'], name: 'Alcohol (Sodium Test)', key: 'alcohol' },
  { keys: ['aldehyde test', 'tollens test', 'silver mirror test'], name: 'Aldehyde (Tollen\'s Test)', key: 'aldehyde' },
  { keys: ['ketone test', 'iodoform test', 'methyl ketone test'], name: 'Ketone (Iodoform Test)', key: 'ketone' },
  { keys: ['carboxylic acid', 'carboxyl test', 'naHCO3 test', 'carboxyl group'], name: 'Carboxylic Acid Test', key: 'carbox' },
  { keys: ['double indicator', 'sodium carbonate titration', 'na2co3 titration'], name: 'Double Indicator Titration', key: 'na2co3' },
  { keys: ['distillation', 'simple distillation', 'fractional distillation', 'purification'], name: 'Simple Distillation', key: 'distill' }
];

// Maps spoken category names to ordered experiment key lists
const SECTION_MAP = [
  { keys: ['organic', 'organic chemistry', 'organics'],
    label: 'Organic Chemistry',
    experiments: ['aldehyde','ketone','carbox','alcohol','aldol','cannizzaro','grignard','lucas','fehling','baeyer','friedel_crafts','diels_alder','sandmeyer','hofmann'] },
  { keys: ['cation', 'cation test', 'cations'],
    label: 'Cation Tests',
    experiments: ['nh4','fe2','fe3','cu2','zn2','pb2'] },
  { keys: ['anion', 'anion test', 'anions'],
    label: 'Anion Tests',
    experiments: ['co3','so4','cl','acetate','no3'] },
  { keys: ['titration', 'titrations'],
    label: 'Titration',
    experiments: ['titration','redox','na2co3'] },
  { keys: ['rate', 'kinetics', 'rate of reaction'],
    label: 'Rate of Reaction',
    experiments: ['rate1','h2o2'] },
  { keys: ['heat', 'enthalpy', 'calorimetry'],
    label: 'Heat Experiments',
    experiments: ['heat','cuso4','nacl'] },
  { keys: ['all', 'everything', 'all reactions', 'all experiments'],
    label: 'All Experiments',
    experiments: ['nh4','fe2','fe3','cu2','zn2','pb2','co3','so4','cl','acetate','no3','titration','redox','heat','rate1','h2o2','alcohol','aldehyde','ketone','carbox','na2co3','distill'] },
];

// Guided session state
const SESSION = {
  active: false,
  queue: [],       // ordered list of experiment keys to go through
  index: 0,        // current position in queue
  label: '',       // category label for narration
};

function stopSession(){
  SESSION.active = false;
  window.speechSynthesis.cancel();
  const btn = document.getElementById('stopSessionBtn');
  if(btn) btn.style.display = 'none';
  showToast('Session ended.', 2000);
}

function matchSection(transcript) {
  const t = transcript.toLowerCase();
  for (const s of SECTION_MAP) {
    for (const k of s.keys) {
      if (t.includes(k)) return s;
    }
  }
  return null;
}

function listenForYesNo(onResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { onResult('unclear'); return; }
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.interimResults = false;
  recog.maxAlternatives = 3;
  recog.onresult = (e) => {
    const said = e.results[0][0].transcript.toLowerCase();
    if (said.includes('yes') || said.includes('yeah') || said.includes('yep') || said.includes('sure') || said.includes('understood') || said.includes('got it') || said.includes('next')) {
      onResult('yes');
    } else if (said.includes('no') || said.includes('nope') || said.includes('again') || said.includes('repeat') || said.includes('stop') || said.includes('end')) {
      onResult('no');
    } else {
      onResult('unclear');
    }
  };
  recog.onerror = () => onResult('unclear');
  recog.start();
}

function runGuidedSession() {
  if (!SESSION.active) return;
  
  // Show/hide stop session button
  const btn = document.getElementById('stopSessionBtn');
  if(btn) btn.style.display = SESSION.active ? 'block' : 'none';

  const currentKey = SESSION.queue[SESSION.index];
  const voiceEntry = VOICE_MAP.find(v => v.key === currentKey);
  const expName = voiceEntry ? voiceEntry.name : currentKey;
  const expData = experimentData[currentKey]; // from chemistry.js

  // Build a summary sentence from the observation
  const summary = expData ? expData.observation.split('.')[0] + '.' : '';

  // Speak the experiment summary, then ask if understood
  speak(`That was the ${expName}. ${summary} Did you understand this reaction? Say yes or no.`, () => {
    showToast('🎙️ Did you understand? Say yes or no...');
    listenForYesNo((answer) => {
      hideToast();
      if (answer === 'no' || answer === 'unclear') {
        // Repeat the same experiment
        speak('No problem. Let me go through it again.', () => {
          resetLab();
          setTimeout(() => {
            const exp = EXP[currentKey];
            if (exp) autoRunExperiment(exp);
            setTimeout(() => runGuidedSession(), (exp.reagents.length * 4000) + 3000);
          }, 600);
        });
      } else {
        // Understood — ask about next
        const hasNext = SESSION.index + 1 < SESSION.queue.length;
        if (hasNext) {
          const nextKey = SESSION.queue[SESSION.index + 1];
          const nextEntry = VOICE_MAP.find(v => v.key === nextKey);
          const nextName = nextEntry ? nextEntry.name : nextKey;
          speak(`Great! Shall I show you the next reaction — ${nextName}? Say yes or no.`, () => {
            showToast(`🎙️ Next: ${nextName}? Say yes or no...`);
            listenForYesNo((ans2) => {
              hideToast();
              if (ans2 === 'yes') {
                SESSION.index++;
                const nextVoiceEntry = VOICE_MAP.find(v => v.key === SESSION.queue[SESSION.index]);
                speak(`Opening ${nextName}.`, () => {
                  closeModal();
                  setTimeout(() => {
                    openLab(nextName, SESSION.queue[SESSION.index]);
                    setTimeout(() => {
                      const exp = EXP[SESSION.queue[SESSION.index]];
                      if (exp) autoRunExperiment(exp);
                      setTimeout(() => runGuidedSession(), (exp.reagents.length * 4000) + 3000);
                    }, 800);
                  }, 400);
                });
              } else {
                SESSION.active = false;
                const stopBtn = document.getElementById('stopSessionBtn');
                if(stopBtn) stopBtn.style.display = 'none';
                speak(`Alright! You've completed ${SESSION.index + 1} experiments in ${SESSION.label}. Well done!`);
                showToast(`✅ Session ended — ${SESSION.index + 1} done`, 4000);
              }
            });
          });
        } else {
          // Reached end of category
          SESSION.active = false;
          const stopBtn = document.getElementById('stopSessionBtn');
          if(stopBtn) stopBtn.style.display = 'none';
          speak(`Excellent! You've completed all ${SESSION.queue.length} experiments in ${SESSION.label}. That's the full section!`);
          showToast(`🎉 All ${SESSION.queue.length} done in ${SESSION.label}!`, 5000);
        }
      }
    });
  });
}

// Override autoRunExperiment to trigger guided session when done
const originalAutoRun = autoRunExperiment;
window.autoRunExperiment = function(exp) {
  if(currentAnimationInterval){
    clearInterval(currentAnimationInterval);
    currentAnimationInterval = null;
  }
  if(!exp || !exp.reagents) return;
  let i = 0;
  const reagents = exp.reagents;
  function runStep(){
    if(i >= reagents.length){
      if(currentStepDisplay){
        const finalMsg = document.createElement('div');
        finalMsg.className = 'step-message';
        finalMsg.textContent = '✅ Experiment complete.';
        finalMsg.style.color = '#4fd1c5';
        currentStepDisplay.appendChild(finalMsg);
        setTimeout(() => finalMsg.remove(), 3000);
      }
      // Trigger guided session check if a session is active
      if(SESSION.active) setTimeout(runGuidedSession, 1500);
      return;
    }
    const r = reagents[i];
    addReagentToBeaker(r.name, r.color, r.type);
    if(currentStepDisplay){
      const stepDiv = document.createElement('div');
      stepDiv.className = 'step-message';
      stepDiv.textContent = `→ Adding ${r.name}`;
      currentStepDisplay.appendChild(stepDiv);
      stepDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => stepDiv.remove(), 2200);
    }
    i++;
    currentAnimationInterval = setTimeout(runStep, (exp.delay || 1500));
  }
  runStep();
};

function startVoiceCommand() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("❌ Speech recognition not supported in this browser. Try Chrome, Edge, or Safari.", 4000);
    speak("Speech recognition not supported in your browser. Please use a modern browser like Chrome.");
    return;
  }

  if (window.__voiceCommandActive) {
    return;
  }

  const voiceBtn = document.getElementById('voiceCommandBtn');
  if (!voiceBtn) return;

  window.__voiceCommandActive = true;
  window.__voiceCommandReset = () => {
    window.__voiceCommandActive = false;
    voiceBtn.style.background = 'rgba(0,255,136,0.08)';
    voiceBtn.style.borderColor = 'rgba(0,255,136,0.25)';
    voiceBtn.innerHTML = '<span>🎙️</span><span>Speak Experiment</span>';
  };

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  voiceBtn.style.background = 'rgba(0,255,136,0.25)';
  voiceBtn.style.borderColor = '#00ff88';
  voiceBtn.innerHTML = '<span>🔴</span><span>Listening...</span>';
  showToast("🎤 Listening... Say experiment name or category", 2000);
  speak("What experiment would you like to see?");
  
  recognition.onresult = (event) => {
    if (window.__voiceCommandReset) window.__voiceCommandReset();
    const command = event.results[0][0].transcript.trim().toLowerCase();
    showToast(`💬 Recognized: "${command}"`, 2500);
    
    // First check if it's a category for guided session
    const section = matchSection(command);
    
    if(section){
      // Start a guided session for the whole category
      SESSION.active = true;
      SESSION.queue = section.experiments.filter(k => EXP[k]); // only keys that have animation data
      SESSION.index = 0;
      SESSION.label = section.label;
      
      // Show stop button
      const stopBtn = document.getElementById('stopSessionBtn');
      if(stopBtn) stopBtn.style.display = 'block';
      
      if(SESSION.queue.length === 0){
        speak(`Sorry, no experiments found for ${section.label}.`);
        SESSION.active = false;
        if(stopBtn) stopBtn.style.display = 'none';
        return;
      }
      
      const firstName = VOICE_MAP.find(v => v.key === SESSION.queue[0])?.name || SESSION.queue[0];
      speak(`Starting the ${section.label} session. There are ${SESSION.queue.length} experiments. Let's begin with ${firstName}.`, () => {
        hideToast();
        openLab(firstName, SESSION.queue[0]);
        setTimeout(() => {
          const exp = EXP[SESSION.queue[0]];
          if(exp) window.autoRunExperiment(exp);
        }, 800);
      });
      
    } else {
      // Try to find a single experiment match
      let found = null;
      for (let item of VOICE_MAP) {
        if (item.keys.some(key => command.includes(key) || command === key)) {
          found = item;
          break;
        }
      }
      
      if (found) {
        // Single experiment — existing behaviour, but NOT a session
        SESSION.active = false;
        const stopBtn = document.getElementById('stopSessionBtn');
        if(stopBtn) stopBtn.style.display = 'none';
        showToast(`✅ Opening: ${found.name}`);
        speak(`Opening the ${found.name}. Starting the experiment now.`, ()=>{
          hideToast();
          openLab(found.name, found.key);
          setTimeout(()=>{
            const exp = EXP[found.key];
            if(exp) window.autoRunExperiment(exp);
          }, 800);
        });
      } else {
        const said = command;
        showToast(`❌ Didn't recognise: "${said}". Try again.`, 3500);
        speak(`Sorry, I didn't recognise that. You can say a category like "organic chemistry" or "titration reactions", or a specific experiment name.`);
      }
    }
  };
  
  recognition.onerror = (event) => {
    if (window.__voiceCommandReset) window.__voiceCommandReset();
    console.error("Speech recognition error", event.error);
    let errorMsg = "Could not recognize speech. ";
    if (event.error === 'not-allowed') errorMsg = "Microphone access denied. Please allow microphone access.";
    else if (event.error === 'no-speech') errorMsg = "No speech detected. Please try again.";
    showToast(`❌ ${errorMsg}`, 4000);
    speak(errorMsg + "Please check your microphone and try again.");
  };

  recognition.onend = () => {
    if (window.__voiceCommandReset) window.__voiceCommandReset();
  };

  try {
    recognition.start();
  } catch (err) {
    if (window.__voiceCommandReset) window.__voiceCommandReset();
    console.error('[VoiceCmd] recognition.start() failed:', err);
    const msg = err && (err.message || err.name) ? `${err.name || 'Error'}: ${err.message || ''}`.trim() : 'Unknown browser error';
    showToast(`⚠️ Mic couldn't start: ${msg}. Check mic permission, HTTPS, or if this page is inside an iframe.`, 5000);
  }
}

// Attach voice button handler
document.addEventListener('DOMContentLoaded', () => {
  const voiceBtn = document.getElementById('voiceCommandBtn');
  if(voiceBtn){
    voiceBtn.addEventListener('click', startVoiceCommand);
  }
  // Also ensure filter function is available globally for search input
  const searchInput = document.getElementById('labSearch');
  if(searchInput){
    searchInput.addEventListener('input', filterExperiments);
  }
  // Attach stop session button handler
  const stopBtn = document.getElementById('stopSessionBtn');
  if(stopBtn){
    stopBtn.addEventListener('click', stopSession);
    stopBtn.style.display = 'none'; // hidden initially
  }
});