/* eslint-disable no-param-reassign */

/**
 * A mongoose schema plugin which applies the following in the toJSON transform call:
 *  - removes __v, createdAt, updatedAt, and any path that has private: true
 *  - replaces _id with id
 *  - removes _id from props and props.options array
 */

const deleteAtPath = (obj, path, index) => {
  if (index === path.length - 1) {
    delete obj[path[index]];
    return;
  }
  deleteAtPath(obj[path[index]], path, index + 1);
};

const toJSON = (schema) => {
  let transform;
  if (schema.options.toJSON && schema.options.toJSON.transform) {
    transform = schema.options.toJSON.transform;
  }

  schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
    transform(doc, ret, options) {
      // Remove private paths
      Object.keys(schema.paths).forEach((path) => {
        if (schema.paths[path].options && schema.paths[path].options.private) {
          deleteAtPath(ret, path.split('.'), 0);
        }
      });

      // Replace _id with id
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;

      // Custom logic: Remove _id from props and options array
      if (ret.props && Array.isArray(ret.props)) {
        ret.props = ret.props.map((prop) => {
          const { _id, ...restProp } = prop.toObject ? prop.toObject() : prop; // Remove _id from each prop

          // Remove _id from each option in options array if exists
          if (restProp.options && Array.isArray(restProp.options)) {
            restProp.options = restProp.options.map((option) => {
              const { _id, ...restOption } = option.toObject ? option.toObject() : option; // Remove _id from each option
              return restOption;
            });
          }

          return restProp;
        });
      }

      // If there is an existing transform, apply it
      if (transform) {
        return transform(doc, ret, options);
      }

      return ret;
    },
  });
};

module.exports = toJSON;
