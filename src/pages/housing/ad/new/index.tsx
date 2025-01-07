import { AdvertisementRegistrationForm } from '@/components/forms'
import { ClientLayout } from '@/components/layouts'
import { SmallArrowLeftIcon } from '@/icons'
import { NextPage } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

const NewAdPage: NextPage = () => {
  // ? Assets
  const { query } = useRouter()
  return (
    <ClientLayout title={`${query.role === 'Marketer' ? 'ثبت آگهی به عنوان بازاریاب' : 'ثبت آگهی شخصی'}`}>
      <div className="pt-[90px] px-4">
        {query.role === 'Marketer' ? 'ثبت آگهی فرم بعنوان ..' : <AdvertisementRegistrationForm />}
      </div>
    </ClientLayout>
  )
}

export default dynamic(() => Promise.resolve(NewAdPage), { ssr: false })
