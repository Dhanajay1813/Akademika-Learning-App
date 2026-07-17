const makeExperiment = (id, productId, title, objective) => ({
  id, productId, title,
  sections: {
    objective,
    theory: 'Sample theory/manual cutout placeholder.',
    functionalBlock: 'Functional block placeholder.',
    procedure: 'Procedure placeholder.',
    equipments: 'Equipment list placeholder.',
    technicalData: {
      datasheet: 'Datasheet placeholder.',
      blockDiagram: 'Block diagram placeholder.',
      circuitDiagram: 'Circuit diagram placeholder.',
      referenceSignal: 'Reference signal placeholder.',
    },
  },
});
export const experiments = [
  makeExperiment('ohms_law', 'basic_electronics', "Study of Ohm's Law", "To verify Ohm's law using voltage and current readings."),
  makeExperiment('diode_characteristics', 'basic_electronics', 'Diode Characteristics', 'To study forward and reverse characteristics of a diode.'),
  makeExperiment('logic_gates_bjt', 'basic_electronics', 'Logic Gates using BJT', 'To implement basic logic gates using BJT circuits.'),
  makeExperiment('ce_amplifier', 'basic_electronics', 'CE Amplifier Response', 'To observe the frequency response of a common emitter amplifier.'),
  makeExperiment('kvl', 'basic_electronics', "Study of Kirchhoff's Voltage Law", "To verify Kirchhoff's Voltage Law for a closed circuit."),
  makeExperiment('bjt_switch', 'basic_electronics', 'BJT as Switch', 'To study the switching operation of a BJT.'),
  makeExperiment('am_modulation', 'acs', 'AM Modulation', 'To study amplitude modulation using a trainer kit.'),
  makeExperiment('fm_modulation', 'acs', 'FM Modulation', 'To study frequency modulation using a trainer kit.'),
  makeExperiment('rf_filter_response', 'rf_trainer', 'RF Filter Response', 'To observe RF filter response with signal input.'),
  makeExperiment('antenna_pattern', 'antenna_trainer', 'Antenna Radiation Pattern', 'To plot the radiation pattern of an antenna.'),
  makeExperiment('led_blink', 'embedded_trainer', 'LED Blink Program', 'To run a basic embedded LED blink experiment.'),
];
export const getExperimentById = (id) => experiments.find((experiment) => experiment.id === id);
export const getExperimentsForProduct = (productId) => experiments.filter((experiment) => experiment.productId === productId);
