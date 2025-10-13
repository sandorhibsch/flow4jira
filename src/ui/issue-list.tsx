import { JiraIssue } from "@/lib/jira/types";

type IssueListProps = {
  issues: JiraIssue[]
}
const IssueList = ({ issues }: IssueListProps) => {
  return (
    <div>
      {issues.map((issue, index) => (
        <div
          className="flex flex-row items-start w-full cursor-grab"
          key={issue.key}
        >
          <div className="w-4 h-3 bg-[#0ACF83] mr-3 mt-1" />
          <div className="text-md mr-3 text-gray-500">{issue.key} </div>
          <div className="text-md">{issue.fields.issuetype.name}</div>
          <div className="text-md">{issue.fields.summary}</div>
          <div className="text-md">{issue.fields.status.name}</div>
          <div className="text-md">{issue.fields.created}</div>
          <div className="text-md">{issue.fields.resolutiondate}</div>
        </div>
      ))}
    </div>

  )
}
//issuetype,summary,status,resolution,created,resolutiondate
export default IssueList;