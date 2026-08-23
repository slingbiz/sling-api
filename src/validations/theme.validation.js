const Joi = require('joi');

const hex = Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const color = Joi.alternatives().try(hex, Joi.string().pattern(/^rgba?\(/i));

const colorGroup = Joi.object()
  .keys({
    main: color,
    contrastText: color,
    paper: color,
    default: color,
    primary: color,
    secondary: color,
    disabled: color,
    hint: color,
    white: color,
    bgColor: color,
    textColor: color,
  })
  .unknown(true);

const setTheme = {
  body: Joi.object()
    .keys({
      theme: Joi.object()
        .keys({
          palette: Joi.object()
            .keys({
              type: Joi.string(),
              primary: colorGroup,
              secondary: colorGroup,
              background: colorGroup,
              text: colorGroup,
              sidebar: colorGroup,
              gray: Joi.object().unknown(true),
            })
            .unknown(true),
          typography: Joi.object().unknown(true),
          divider: color,
          spacing: Joi.number(),
          direction: Joi.string(),
          status: Joi.object().unknown(true),
          overrides: Joi.object().unknown(true),
        })
        .unknown(true),
      themeStyle: Joi.string(),
      themeMode: Joi.string(),
      navStyle: Joi.string(),
      layoutType: Joi.string(),
    })
    .unknown(true),
};

module.exports = {
  setTheme,
};
