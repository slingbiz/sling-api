const { detectDependencies } = require('../../../src/services/widgetGenerate.service');

describe('detectDependencies makeStyles', () => {
  test('puts makeStyles on @material-ui/core/styles, not @material-ui/core', () => {
    const deps = detectDependencies(`
      const useStyles = makeStyles((theme) => ({ root: {} }));
      const PreviewComponent = () => {
        const classes = useStyles();
        return <Box className={classes.root} />;
      };
    `);
    expect(deps['@material-ui/core/styles']).toEqual(['makeStyles']);
    expect(deps['@material-ui/core']).toEqual(['Box']);
    expect(deps['@material-ui/core']).not.toContain('makeStyles');
  });
});
