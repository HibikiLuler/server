import { BaseModel } from '@libs/db/models/base.model'
import { arrayProp, prop } from '@typegoose/typegoose'
import { IsOptional, IsString, IsUrl, isURL } from 'class-validator'

const validateURL = {
  message: '请更正为正确的网址',
  validator: (v: string | Array<string>): boolean => {
    if (!v) {
      return true
    }
    if (Array.isArray(v)) {
      return v.every((url) => isURL(url, { require_protocol: true }))
    }
    if (!isURL(v, { require_protocol: true })) {
      return false
    }
  },
}
export class Project extends BaseModel {
  @prop({ required: true, unique: true })
  @IsString()
  name: string

  @prop({
    validate: validateURL,
  })
  @IsUrl({ require_protocol: true }, { message: '请更正为正确的网址' })
  @IsOptional()
  previewUrl?: string

  @prop({
    validate: validateURL,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '请更正为正确的网址' })
  docUrl?: string

  @prop({
    validate: validateURL,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: '请更正为正确的网址' })
  projectUrl?: string

  @IsUrl({ require_protocol: true }, { each: true })
  @IsOptional()
  @arrayProp({
    items: String,
    validate: validateURL,
  })
  images?: string[]

  @prop({ required: true })
  @IsString()
  @IsOptional()
  description?: string

  @prop({
    validate: validateURL,
  })
  @IsUrl({ require_protocol: true }, { message: '请更正为正确的网址' })
  @IsOptional()
  avatar?: string

  @prop()
  @IsString()
  text: string
}
