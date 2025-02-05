import { useEffect } from 'react'

import { showAlert } from '@/store'

import { useAppDispatch } from '@/hooks'

import { getErrorMessage } from '@/utils'

import type { FetchBaseQueryError } from '@reduxjs/toolkit/dist/query'
import type { SerializedError } from '@reduxjs/toolkit'

interface Props {
  isSuccess: boolean
  isError: boolean
  error?: FetchBaseQueryError | SerializedError
  message?: string
  onSuccess?: () => void
  onError?: () => void
  data?: any
}

const HandleResponse: React.FC<Props> = (props) => {
  // ? Porps
  const { isSuccess, isError, error, message, onSuccess, onError,data } = props

  // ? Assets
  const dispatch = useAppDispatch()

  // ? Re-Renders
  useEffect(() => {
    if (isSuccess) {
      onSuccess?.()

    //   dispatch(
    //     showAlert({
    //       status: 'success',
    //       title: message || 'عملیات با موفقیت انجام شد',
    //     })
    //   )
    }

    if (isError && error) {
      onError?.()

    //   dispatch(
    //     showAlert({
    //       status: 'error',
    //       title: getErrorMessage(error) || 'متاسفانه خطایی رخ داده است',
    //     })
    //   )
    }
  }, [isSuccess, isError, error])

  return null
}

export default HandleResponse
