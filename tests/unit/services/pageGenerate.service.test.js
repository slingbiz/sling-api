const { parsePageResponse, tryParsePageMeta, listCompletedSections } = require('../../../src/services/pageGenerate.service');

function block(id, label, key, text) {
  return `---SECTION---
{"id":"${id}","label":"${label}","name":"${label}","key":"${key}","description":"${label}","icon":"widgets","type":"widget","props":[],"dependencies":{"@material-ui/core":["Box","Typography"]}}
---CODE---
const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) }
}));

const PreviewComponent = () => {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      <Typography>${text}</Typography>
    </Box>
  );
};
---END---`;
}

const SAMPLE = `---PAGE---
{"title":"Clinic home","key":"clinic-home","path":"/","description":"Landing for a clinic"}
${block('hero', 'Hero banner', 'HeroBanner', 'Care you can trust')}
${block('hours', 'Hours', 'ClinicHours', 'Mon–Fri 9–5')}
${block('services', 'Services', 'ClinicServices', 'Checkups and labs')}
${block('team', 'Team', 'ClinicTeam', 'Our doctors')}
${block('cta', 'Contact', 'ClinicCta', 'Book a visit')}
`;

describe('parsePageResponse', () => {
  test('returns page meta and at least five sections with code', () => {
    const result = parsePageResponse(SAMPLE);
    expect(result.page.title).toBe('Clinic home');
    expect(result.page.path).toBe('/clinic-home');
    expect(result.sections).toHaveLength(5);
    expect(result.sections[0].id).toBe('hero');
    expect(result.sections[0].label).toBe('Hero banner widget');
    expect(result.sections[0].code).toMatch(/PreviewComponent/);
    expect(result.sections[1].key).toBe('ClinicHours');
  });

  test('asks for Grid breakpoints so widgets work in a half-width cell and on a phone', () => {
    const {SYSTEM_PROMPT} = require('../../../src/services/pageGenerate.service');
    expect(SYSTEM_PROMPT).toMatch(/theme\.breakpoints/);
    expect(SYSTEM_PROMPT).toMatch(/Grid item xs=\{12\}/);
    expect(SYSTEM_PROMPT).toMatch(/maxWidth: '100%'/);
  });

  test('rejects a blob with no sections', () => {
    expect(() => parsePageResponse('just some text')).toThrow(/PAGE and SECTION/);
  });

  test('rejects fewer than five completed sections', () => {
    const four = SAMPLE.split('---SECTION---').slice(0, 5).join('---SECTION---');
    expect(() => parsePageResponse(four)).toThrow(/five sections/);
  });

  test('emits the first completed section before the rest of the stream arrives', () => {
    const firstOnly = SAMPLE.split('---SECTION---').slice(0, 2).join('---SECTION---');
    expect(tryParsePageMeta(firstOnly).title).toBe('Clinic home');
    const partial = listCompletedSections(firstOnly);
    expect(partial).toHaveLength(1);
    expect(partial[0].label).toBe('Hero banner widget');
  });
});
