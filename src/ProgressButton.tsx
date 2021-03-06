import * as React from 'react'
import { Async } from './Async'

export interface ProgressButtonProps
  extends React.DetailedHTMLProps<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    > {
  asyncDataType: Async.Type
  progress: Async.Progress
}

export class ProgressButton extends React.PureComponent<ProgressButtonProps> {
  render() {
    let isSuccess = false
    let isProgressing = false
    let isError = false

    isSuccess = this.props.progress === Async.Progress.Done
    isProgressing = this.props.progress === Async.Progress.Progressing
    isError = this.props.progress === Async.Progress.Error
    let title = ''
    switch (this.props.asyncDataType) {
      case Async.Type.Create: {
        title = 'Create new'
        break
      }
      case Async.Type.Delete: {
        title = 'Delete'
        break
      }
      default: {
        title = 'Save'
        break
      }
    }
    const { asyncDataType, ...props } = this.props
    return (
      <button
        {...props}
        style={{
          ...props.style,
          opacity: isProgressing ? 0.5 : 1,
          cursor: isProgressing || isSuccess || this.props.disabled ? 'not-allowed' : 'pointer',
          borderColor: isError ? 'red' : undefined
        }}
        disabled={isProgressing || isSuccess || this.props.disabled}
        onClick={e => {
          if (!isProgressing && !this.props.disabled) {
            if (this.props.onClick) this.props.onClick(e)
          }
        }}
      >
        {title}
      </button>
    )
  }
}
