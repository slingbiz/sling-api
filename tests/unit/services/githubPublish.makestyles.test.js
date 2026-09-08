const { buildComponentFile } = require('../../../src/services/githubPublish.service');

describe('buildComponentFile makeStyles inject', () => {
  const code = `const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) }
}));

const PreviewComponent = () => {
  const classes = useStyles();
  return <div className={classes.root} />;
};`;

  test('prepends makeStyles from @material-ui/core/styles when the code uses it', () => {
    const file = buildComponentFile({ code, dependencies: { '@material-ui/core': ['Box'] } });
    expect(file).toMatch(/import \{makeStyles\} from '@material-ui\/core\/styles';/);
    expect(file).toMatch(/import \{Box\} from '@material-ui\/core';/);
    expect(file.indexOf("import {makeStyles}")).toBeLessThan(file.indexOf('const useStyles'));
  });

  test('does not duplicate an existing makeStyles import', () => {
    const file = buildComponentFile({
      code,
      dependencies: { '@material-ui/core/styles': ['makeStyles'] },
    });
    expect(file.match(/import \{makeStyles\} from '@material-ui\/core\/styles';/g)).toHaveLength(1);
  });

  test('does not inject makeStyles when the code never calls it', () => {
    const file = buildComponentFile({
      code: 'const PreviewComponent = () => null;',
      dependencies: {},
    });
    expect(file).not.toMatch(/makeStyles/);
  });
});
