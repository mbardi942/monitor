import { Identifier } from "./identifier.js";

export abstract class Entity<IdType extends Identifier<any>> {
  protected readonly _id: IdType;

  constructor(id: IdType) {
    this._id = id;
  }

  public get id(): IdType {
    return this._id;
  }

  public equals(object?: Entity<IdType>): boolean {
    if (object === null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this._id.equals(object.id);
  }
}
