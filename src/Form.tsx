import * as React from 'react'
import * as _ from 'lodash'
import { findDOMNode } from 'react-dom'
import { formRules, ValidationRuleType, Validation } from './formrules'
import { ProgressButtonProps, ProgressButton } from './ProgressButton'
const L: any = require('partial.lenses')

type ValidationRules = {
  [P in keyof typeof formRules]?: (typeof formRules)[P] extends ValidationRuleType<boolean>
    ? boolean
    : (typeof formRules)[P] extends ValidationRuleType<number> ? number : string
}

export type ErrorLabelProps<T> = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  name: keyof T
}
export type ValidatedProps<T> = {
  name: keyof T
  children: (validation: Validation | null) => JSX.Element
}
export type TextAreaProps<T> = _.Omit<
  React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>,
  'ref'
> &
  ValidationRules & {
    name: keyof T
    value?: number | string | boolean
  }
export type InputProps<T> = _.Omit<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'ref'
> &
  ValidationRules & {
    name: keyof T
    value?: number | string | boolean
  }

export interface FormSubScopePublicProps<T, S extends keyof T> {
  scope: S
}

const unWrapValue = (wrapped: any) => {
  return wrapped.value
}

export interface FormScopeSharedPublicProps<T> {
  optimized?: boolean
  children: (
    Scope: {
      Sub: <B extends keyof T>(
        props: FormSubScopePublicProps<T, B> & FormScopeSharedPublicProps<T[B]>
      ) => JSX.Element | null
      Input: (props: InputProps<T>) => JSX.Element
      TextArea: (props: TextAreaProps<T>) => JSX.Element
      Validated: (props: ValidatedProps<T>) => JSX.Element
    },
    value: T,
    handleFieldChange: (e: FormEventType<T>) => void
  ) => JSX.Element | null
}

type LensPathType = (string | number)[]

type FormEventType<T> = T extends Array<infer G> ? { [K in keyof G]?: G[K] }[] : { [K in keyof T]?: T[K] }

export interface FormScopePrivateProps<T> {
  rootValue: T
  value: any
  onChange: (e: any) => void
  onInsertRule: (lensPath: LensPathType, rule: ValidationRules, ref: React.RefObject<HTMLInputElement>) => void
  onRemoveRule: (lensPath: LensPathType) => void
  touchField: (lensPath: LensPathType) => void
  unTouchField: (lensPath: LensPathType) => void
  lensPathToRoot: (string | number)[]
}

export interface FormProps<T>
  extends _.Omit<React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>, 'onChange'> {
  value: T
  onChange: (data: T) => void
  allowUndefinedPaths?: boolean
  children: (
    Form: {
      Root: (props: FormScopeSharedPublicProps<T>) => JSX.Element
      SubmitButton: (props: ProgressButtonProps) => JSX.Element
    }
  ) => JSX.Element
}

class InputInner extends React.Component<
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
    HTMLInputElement | HTMLTextAreaElement
  > & {
    onDidMount: (ref: React.RefObject<any>) => void
    onWillUnmount: () => void
    _textArea: boolean
  }
> {
  ref = React.createRef<any>()
  render() {
    if (this.props._textArea) {
      return <textarea ref={this.ref as any} {..._.omit(this.props, ['onDidMount', 'onWillUnmount', '_textArea'])} />
    } else {
      return <input ref={this.ref as any} {..._.omit(this.props, ['onDidMount', 'onWillUnmount', '_textArea'])} />
    }
  }
  componentDidMount() {
    this.props.onDidMount(this.ref)
  }

  componentWillUnmount() {
    this.props.onWillUnmount()
  }
}

function getValidationFromRules(rules: any, value: any) {
  // _.keys is untyped!!
  const validationsForField = _.mapValues(_.omit(rules, 'ref'), (ruleValue, rule) => {
    const validation = (formRules as any)[rule as keyof typeof formRules](value, ruleValue as any)
    return validation
  })
  // TODO: Add so that returns all validations that have not passed, not just the first one
  const invalid = _.toPairs(validationsForField).filter(arr => !!arr[1])
  if (invalid.length > 0) {
    return invalid[0][1] as Validation
  }
  return null
}

export class FormScope<T, S extends keyof T> extends React.Component<
  FormScopeSharedPublicProps<T[S]> & FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>
> {
  constructor(props: FormScopeSharedPublicProps<T[S]> & FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>) {
    super(props)
  }
  shouldComponentUpdate(nextProps: FormScopePrivateProps<T> & FormSubScopePublicProps<T, S>) {
    // if not optimized scope always return true
    if (!this.props.optimized) return true

    if (nextProps.scope !== this.props.scope) throw Error('Scope cannot change for sub')
    if (nextProps.rootValue[nextProps.scope] !== this.props.rootValue[this.props.scope]) {
      console.log('needs update', nextProps.scope)
      return true
    }
    return false
  }
  getValidationForField(lens: LensPathType) {
    // field not touched
    const rules = L.get([lens, 'rules'], this.props.value)
    const touched = L.get([lens, 'touched'], this.props.value)
    // const isFocused = _.includes(this.state.focusedFields, props.name)
    if (touched && rules) {
      const value = L.get([lens, 'value'], this.props.value)
      return getValidationFromRules(rules, value)
    }
    return null
  }
  getLensPathForField = (field: keyof T[S]) => {
    return _.concat(this.props.lensPathToRoot, [this.props.scope as any, field])
  }
  Sub: <B extends keyof T[S]>(
    props: FormSubScopePublicProps<T[S], B> & FormScopeSharedPublicProps<(T[S])[B]>
  ) => JSX.Element | null = props => {
    return (
      <FormScope
        {...props}
        onChange={this.props.onChange}
        rootValue={this.props.rootValue[this.props.scope]}
        value={this.props.value}
        onInsertRule={this.props.onInsertRule}
        onRemoveRule={this.props.onRemoveRule}
        touchField={this.props.touchField}
        unTouchField={this.props.unTouchField}
        lensPathToRoot={this.props.lensPathToRoot.concat([this.props.scope as any])}
        children={(value, a, b) => {
          return props.children(value, a, b)
        }}
      />
    )
  }
  Validated = (props: ValidatedProps<T[S]>) => {
    const validation = this.getValidationForField(this.getLensPathForField(props.name))
    return props.children(validation)
  }
  TextArea = (props: TextAreaProps<T[S]>) => {
    return this.Input({ ...props, _textArea: true } as any)
  }
  Input = (props: InputProps<T[S]>) => {
    const rules = _.pick(props, _.keys(formRules)) as ValidationRules
    const lensPath = this.getLensPathForField(props.name)
    const value = L.get([lensPath, 'value', L.optional], this.props.value)
    if (!value == null && props.value == null)
      throw Error('Input needs to have value in Form state or provided one in props')
    if (!_.isEmpty(rules) && (props.disabled || props.readOnly))
      throw Error('Cant have rules on a non modifiable field')
    return (
      <InputInner
        onChange={this.riggedOnChange}
        value={value}
        _textArea={(props as any)._textArea}
        {..._.omit(_.omit(props, 'ref'), _.keys(formRules))}
        key={JSON.stringify(lensPath) + JSON.stringify(rules)}
        onDidMount={ref => {
          this.props.onInsertRule(lensPath, rules, ref)
        }}
        onWillUnmount={() => {
          this.props.onRemoveRule(lensPath)
        }}
        onBlur={() => {
          // touch non number fields on blur
          this.props.touchField(lensPath)
        }}
        onFocus={() => {
          /*
          if (props.type === "number") {
            this.props.touchField(lensPath)
          } else {
            // untouch all but number fields on focus
            this.props.unTouchField(lensPath)
            })
        } */
        }}
        name={props.name}
      />
    )
  }
  riggedOnChange = (e: React.FormEvent<any> | FormEventType<T[S]> | FormEventType<T[S]>[]) => {
    // a hack to know if these are fed
    if ((e as any).target && _.isObject((e as any).target)) {
      const event = e as any

      const rigged = {
        data: {
          [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
        },
        rootLens: this.props.lensPathToRoot.concat([this.props.scope as any])
      }
      this.props.onChange(rigged as any)
    } else if (_.isArray(e)) {
      const events = e as FormEventType<T[S]>[]
      const rigged = events.map(event => {
        return {
          data: event,
          rootLens: this.props.lensPathToRoot.concat([this.props.scope as any])
        }
      })
      this.props.onChange(rigged)
    } else {
      const event = e as FormEventType<T[S]>
      const rigged = {
        data: event,
        rootLens: this.props.lensPathToRoot.concat([this.props.scope as any])
      }
      this.props.onChange(rigged)
    }
  }
  render() {
    return (
      <React.Fragment>
        {this.props.children(
          {
            Input: this.Input,
            TextArea: this.TextArea,
            Validated: this.Validated,
            Sub: this.Sub
          },
          L.modify(wrappedValues, unWrapValue, this.props.rootValue[this.props.scope]),
          this.riggedOnChange
        )}
      </React.Fragment>
    )
  }
}

export interface FormState<T> {
  value: T
}

const wrapValue = (value: number | string | boolean) => {
  return {
    rules: [],
    touched: false,
    ref: null,
    type: 'wrappedValue',
    value
  }
}

const isWrappedValue = (o: any) => {
  return o.type && o.type === 'wrappedValue'
}

const wrappedValues = L.compose(
  L.lazy((rec: any) => {
    return L.ifElse(_.isObject, L.ifElse(isWrappedValue, L.optional, [L.children, rec]), L.optional)
  }),
  L.when(isWrappedValue)
)

export class Form<T> extends React.Component<FormProps<T>, FormState<T>> {
  state: FormState<T> = {
    // no pricings yet registered so lets just cast this
    value: L.modify(L.leafs, wrapValue, this.props.value)
  }
  SubmitButton = (props: ProgressButtonProps) => {
    /*
    const touchedFieldsWithRules = _.intersection(
      _.keys(this.state.rules) as string[],
      this.state.touchedFieldPaths as string[]
    )
    const disabled = !touchedFieldsWithRules.reduce((acc, val) => {
      return acc && !this.getValidationForField(val as any)
    }, true)
    */
    return <ProgressButton {..._.omit(props, 'ref')} disabled={false} type="submit" />
  }
  touchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in touchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return L.set([lensPath, 'touched'], true, state)
    })
  }
  unTouchField = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in unTouchField: ' + lensPath.toString())
    }
    this.setState(state => {
      return L.set([lensPath, 'touched'], false, state)
    })
  }
  removeRule = (lensPath: LensPathType) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in removeRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return L.remove([lensPath, 'rules', L.optional], state)
    })
  }
  insertRule = (lensPath: LensPathType, rule: ValidationRules, ref: React.RefObject<HTMLInputElement>) => {
    /* TODO Check that the path exists or else throw Error */
    if (!L.isDefined(lensPath)) {
      throw Error('Lens path does not exits in insertRule: ' + lensPath.toString())
    }
    this.setState(state => {
      return L.set([lensPath, 'ref'], ref, L.set([lensPath, 'rules'], rule, state))
    })
  }
  Root: (props: FormScopeSharedPublicProps<T>) => JSX.Element = props => {
    return (
      <FormScope
        {...props}
        rootValue={this.state}
        value={this.state}
        onInsertRule={this.insertRule}
        onRemoveRule={this.removeRule}
        touchField={this.touchField}
        unTouchField={this.unTouchField}
        onChange={this.handleFieldChange}
        lensPathToRoot={[]}
        scope="value"
      />
    )
  }
  handleFieldChange = (e: any) => {
    let arr: any[]
    if (_.isArray(e)) {
      arr = _.flatten(
        e.map((ee, idx) => {
          return _.map(ee.data, (value, key) => {
            return {
              value: value,
              lens: ee.rootLens.concat([idx, key])
            }
          })
        })
      )
      console.log(arr)
    } else {
      arr = _.map(e.data, (value, key) => {
        return {
          value: value,
          lens: e.rootLens.concat([key])
        }
      })
      console.log(arr)
    }
    this.setState(state => {
      return arr.reduce((agg, e) => {
        if (!L.isDefined([e.lens, 'value'], state)) {
          if (this.props.allowUndefinedPaths) {
            console.warn('Undefined form field value: ' + e.lens.toString())
          } else {
            throw Error('Undefined form field value: ' + e.lens.toString())
          }
        }
        return L.set([e.lens, 'value'], e.value, agg)
      }, state)
    })
  }
  componentDidUpdate(prevProps: any) {
    if (prevProps.value !== this.props.value && JSON.stringify(prevProps.value) !== JSON.stringify(this.props.value)) {
      // Do a JSON parse to check this
      this.setState({
        value: L.modify(L.leafs, wrapValue, this.props.value)
      })

      throw Error('Form changed its initial value, this is not allowed')
    }
  }
  render() {
    const props = _.omit(this.props, ['value', 'onChange'])
    return (
      <form
        {..._.omit(props, ['value', 'allowUndefinedPaths']) as any}
        onSubmit={(e: any) => {
          e.preventDefault()
          e.stopPropagation()
          const invalidFieldsLens = L.compose(
            wrappedValues,
            L.when((wv: any) => {
              return wv.rules && getValidationFromRules(wv.rules, wv.value)
            })
          )
          const invalidFields = L.collect(invalidFieldsLens, this.state)
          console.log('invalid', invalidFields)
          if (invalidFields.length > 0) {
            this.setState(
              state => {
                return L.set([invalidFieldsLens, 'touched'], true, state)
              },
              () => {
                ;(findDOMNode(invalidFields[0].ref.current)! as any).focus()
              }
            )
          } else {
            this.props.onChange(L.modify(wrappedValues, unWrapValue, this.state.value))
          }
        }}
      >
        {this.props.children({
          Root: this.Root,
          SubmitButton: this.SubmitButton
        })}
      </form>
    )
  }
}
