import { Entity } from "@monitor/shared-kernel";
import { AuthProfileId } from "./auth-profile-id.js";
import { AuthProfileType } from "./auth-profile-type.js";

export interface AuthProfileProps {
  dashboardId: string;
  name: string;
  type: AuthProfileType;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthProfile extends Entity<AuthProfileId> {
  private _dashboardId: string;
  private _name: string;
  private _type: AuthProfileType;
  private _data: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: AuthProfileId,
    dashboardId: string,
    name: string,
    type: AuthProfileType,
    data: Record<string, any>,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id);
    this._dashboardId = dashboardId;
    this._name = name;
    this._type = type;
    this._data = data;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  public get dashboardId(): string {
    return this._dashboardId;
  }

  public get name(): string {
    return this._name;
  }

  public get type(): AuthProfileType {
    return this._type;
  }

  public get data(): Record<string, any> {
    return this._data;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public toHeaders(): Record<string, string> {
    const type = this._type;
    const data = this._data;

    switch (type) {
      case "BEARER": {
        if (!data.token) return {};
        return { Authorization: `Bearer ${data.token}` };
      }
      case "API_KEY": {
        const headerName = data.headerName?.trim() || "X-API-Key";
        if (!data.headerValue) return {};
        return { [headerName]: data.headerValue };
      }
      case "BASIC_AUTH": {
        const username = data.username || "";
        const password = data.password || "";
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        return { Authorization: `Basic ${encoded}` };
      }
      case "CUSTOM_HEADERS": {
        return { ...(data.headers || {}) };
      }
      case "OAUTH2_CLIENT_CREDENTIALS": {
        const token = data.accessToken || data.token;
        if (token) {
          const headerName = data.targetHeaderName?.trim() || "Authorization";
          const prefix = data.targetHeaderPrefix !== undefined ? data.targetHeaderPrefix : "Bearer ";
          return { [headerName]: `${prefix}${token}` };
        }
        return {};
      }
      case "DYNAMIC_LOGIN": {
        const token = data.accessToken || data.token;
        if (token) {
          const headerName = data.targetHeaderName?.trim() || "Authorization";
          const prefix = data.targetHeaderPrefix !== undefined ? data.targetHeaderPrefix : "Bearer ";
          return { [headerName]: `${prefix}${token}` };
        }
        return {};
      }
      default:
        return {};
    }
  }

  public update(props: { name?: string; type?: AuthProfileType; data?: Record<string, any> }): void {
    if (props.name) this._name = props.name;
    if (props.type) this._type = props.type;
    if (props.data) this._data = props.data;
    this._updatedAt = new Date();
  }

  public cloneForDashboard(targetDashboardId: string, newName?: string): AuthProfile {
    const cloneName = newName || `${this._name} (Copia)`;
    return AuthProfile.create({
      dashboardId: targetDashboardId,
      name: cloneName,
      type: this._type,
      data: JSON.parse(JSON.stringify(this._data)),
    });
  }

  public static create(props: {
    dashboardId: string;
    name: string;
    type: AuthProfileType;
    data: Record<string, any>;
  }): AuthProfile {
    if (!props.name || props.name.trim() === "") {
      throw new Error("Il nome del profilo di autenticazione è obbligatorio.");
    }
    if (!props.dashboardId) {
      throw new Error("Il dashboardId è obbligatorio.");
    }
    const now = new Date();
    return new AuthProfile(
      AuthProfileId.generate(),
      props.dashboardId,
      props.name.trim(),
      props.type,
      props.data || {},
      now,
      now
    );
  }

  public static reconstitute(
    id: AuthProfileId,
    props: AuthProfileProps
  ): AuthProfile {
    return new AuthProfile(
      id,
      props.dashboardId,
      props.name,
      props.type,
      props.data,
      props.createdAt,
      props.updatedAt
    );
  }
}
