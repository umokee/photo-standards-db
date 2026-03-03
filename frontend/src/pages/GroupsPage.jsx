import { useState } from 'react'
import Select from '../components/Select'

export default function GroupsPage() {
  const [type, setType] = useState('')

  return (
    <div>
      <h1>Groups</h1>
      <Select label="Type" options={[{ value: 'private', label: 'Private' }, { value: 'public', label: 'Public' }]} value={type} onChange={setType} />
    </div>
  )
}
