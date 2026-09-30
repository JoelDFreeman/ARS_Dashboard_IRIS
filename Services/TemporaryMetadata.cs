using System.Text.Json;
using ActiveRolesDashboard.Models;

namespace ActiveRolesDashboard.Services;

/// <summary>
/// TEMPORARY METADATA: synthetic directory objects used only by DemoMode for UI and table testing.
/// These records are never included in live Active Roles collection.
/// </summary>
public static class TemporaryMetadata
{
    public const string Label = "TEMPORARY METADATA - DemoMode synthetic records for testing only";

    private const string Domain = "DEMO";
    private const string AdBaseDn = "DC=demo,DC=local";
    private const string UsersOu = "OU=Users,DC=demo,DC=local";
    private const string GroupsOu = "OU=Groups,DC=demo,DC=local";
    private const string EntraTenant = "demo.onmicrosoft.com";

    private const int GlobalSecurityGroup = unchecked((int)0x80000002);
    private const int DomainLocalSecurityGroup = unchecked((int)0x80000004);
    private const int UniversalSecurityGroup = unchecked((int)0x80000008);
    private const int UniversalDistributionGroup = 8;

    private sealed record UserRecord(
        string Name,
        string SamAccountName,
        string Dn,
        string ObjectGuid,
        bool Enabled,
        string? ManagerDn,
        string Email);

    private sealed record GroupRecord(
        string Name,
        string Dn,
        string ObjectGuid,
        int GroupType,
        string[] MemberDns,
        string? OwnerDn,
        string[] SecondaryOwnerDns,
        string? Mail = null);

    private static string UserDn(string cn) => $"CN={cn},{UsersOu}";
    private static string GroupDn(string cn) => $"CN={cn},{GroupsOu}";

    private static readonly UserRecord[] Users =
    [
        new("Alex Morgan (TEMP)", "amorgan", UserDn("Alex Morgan (TEMP)"), "00000000-0000-4000-8000-000000000001", true, UserDn("Taylor Owner (TEMP)"), "alex.morgan@demo.local"),
        new("Sam Lee (TEMP)", "slee", UserDn("Sam Lee (TEMP)"), "00000000-0000-4000-8000-000000000002", true, UserDn("Taylor Owner (TEMP)"), "sam.lee@demo.local"),
        new("Jamie Patel (TEMP)", "jpatel", UserDn("Jamie Patel (TEMP)"), "00000000-0000-4000-8000-000000000003", true, UserDn("Alex Morgan (TEMP)"), "jamie.patel@demo.local"),
        new("Riley Chen (TEMP)", "rchen", UserDn("Riley Chen (TEMP)"), "00000000-0000-4000-8000-000000000004", true, null, "riley.chen@demo.local"),
        new("Taylor Owner (TEMP)", "towner", UserDn("Taylor Owner (TEMP)"), "00000000-0000-4000-8000-000000000005", true, null, "taylor.owner@demo.local"),
        new("Jordan Reyes (TEMP)", "jreyes", UserDn("Jordan Reyes (TEMP)"), "00000000-0000-4000-8000-000000000006", true, UserDn("Taylor Owner (TEMP)"), "jordan.reyes@demo.local"),
        new("Devon Disabled (TEMP)", "ddisabled", UserDn("Devon Disabled (TEMP)"), "00000000-0000-4000-8000-000000000007", false, UserDn("Alex Morgan (TEMP)"), "devon.disabled@demo.local")
    ];

    private static readonly GroupRecord[] Groups =
    [
        new("All Staff (TEMP)", GroupDn("All Staff (TEMP)"), "10000000-0000-4000-8000-000000000001", UniversalDistributionGroup,
            [GroupDn("IT Operations (TEMP)"), UserDn("Jamie Patel (TEMP)"), UserDn("Taylor Owner (TEMP)")], UserDn("Taylor Owner (TEMP)"), []),
        new("IT Operations (TEMP)", GroupDn("IT Operations (TEMP)"), "10000000-0000-4000-8000-000000000002", GlobalSecurityGroup,
            [UserDn("Alex Morgan (TEMP)"), UserDn("Sam Lee (TEMP)")], UserDn("Jordan Reyes (TEMP)"), []),
        new("Helpdesk (TEMP)", GroupDn("Helpdesk (TEMP)"), "10000000-0000-4000-8000-000000000003", DomainLocalSecurityGroup,
            [UserDn("Jamie Patel (TEMP)"), UserDn("Riley Chen (TEMP)")], UserDn("Alex Morgan (TEMP)"), []),
        new("Privileged Operators (TEMP)", GroupDn("Privileged Operators (TEMP)"), "10000000-0000-4000-8000-000000000004", UniversalSecurityGroup,
            [GroupDn("IT Operations (TEMP)"), GroupDn("Helpdesk (TEMP)")], UserDn("Jordan Reyes (TEMP)"), [UserDn("Taylor Owner (TEMP)")]),
        new("IT Announcements (TEMP)", GroupDn("IT Announcements (TEMP)"), "10000000-0000-4000-8000-000000000005", UniversalDistributionGroup,
            [UserDn("Alex Morgan (TEMP)"), UserDn("Sam Lee (TEMP)")], null, [], "announcements@demo.local"),
        new("QA Empty Group (TEMP)", GroupDn("QA Empty Group (TEMP)"), "10000000-0000-4000-8000-000000000006", GlobalSecurityGroup,
            [], null, []),
        new("Mail-enabled Security (TEMP)", GroupDn("Mail-enabled Security (TEMP)"), "10000000-0000-4000-8000-000000000007", UniversalSecurityGroup,
            [UserDn("Sam Lee (TEMP)"), GroupDn("Helpdesk (TEMP)")], UserDn("Taylor Owner (TEMP)"), [], "mail-security@demo.local")
    ];

    public static void PopulateDashboardSummary(DashboardSummary summary)
    {
        var userItems = Users.Select(ToAdUserJson).ToList();
        var adGroups = CreateAdGroupsSummary();

        summary.ADUserAccounts = new ADUserAccountsSummary { TotalCount = userItems.Count, Items = userItems };
        summary.ADGroups = adGroups;
        summary.DistributionGroups = ToGroupDetails(adGroups, Groups.Where(g => !IsSecurityGroup(g)));
        summary.DomainLocalGroups = ToGroupDetails(adGroups, Groups.Where(g => (g.GroupType & 0x4) != 0));
        summary.GlobalGroups = ToGroupDetails(adGroups, Groups.Where(g => (g.GroupType & 0x2) != 0));
        summary.MailEnabledSecurityGroups = ToGroupDetails(adGroups, Groups.Where(g => IsSecurityGroup(g) && !string.IsNullOrWhiteSpace(g.Mail)));
        summary.SecurityGroups = ToGroupDetails(adGroups, Groups.Where(IsSecurityGroup));
        summary.UniversalGroups = ToGroupDetails(adGroups, Groups.Where(g => (g.GroupType & 0x8) != 0));

        var userDetails = Users.Select(user => new ADUserAccountDetailInfo
        {
            Name = user.Name,
            Domain = Domain,
            Dn = user.Dn,
            Enabled = user.Enabled,
            Description = "TEMPORARY METADATA demo account"
        }).ToList();
        summary.EnabledUsers = ToUserDetails(userDetails.Where(user => user.Enabled));
        summary.DisabledUsers = ToUserDetails(userDetails.Where(user => !user.Enabled));
        summary.NoManagerUser = ToGovernanceDetails(Users.Where(user => string.IsNullOrWhiteSpace(user.ManagerDn)));
        summary.NoGroupOwner = new NoGroupOwnerSummary
        {
            Items = Groups
                .Where(group => string.IsNullOrWhiteSpace(group.OwnerDn) && group.SecondaryOwnerDns.Length == 0)
                .Select(group => new NoGroupOwnerInfo { Name = group.Name, Dn = group.Dn, Guid = group.ObjectGuid })
                .ToList()
        };
        summary.NoGroupOwner.TotalCount = summary.NoGroupOwner.Items.Count;
        summary.EmptyGroups = ToGovernanceDetails(Groups.Where(group => group.MemberDns.Length == 0));
        summary.EntraTotals = CreateEntraSummary();
    }

    public static (string Name, string Dn)? ResolveGroup(string nameOrDn)
    {
        var query = nameOrDn.Trim();
        var group = Groups.FirstOrDefault(item =>
            string.Equals(item.Name, query, StringComparison.OrdinalIgnoreCase)
            || string.Equals(item.Dn, query, StringComparison.OrdinalIgnoreCase));
        return group == null ? null : (group.Name, group.Dn);
    }

    public static List<GroupMemberNode> ExpandGroupChildren(string groupDn, int currentDepth, int maxDepth, ISet<string> ancestorDns)
    {
        var group = Groups.FirstOrDefault(item => string.Equals(item.Dn, groupDn, StringComparison.OrdinalIgnoreCase));
        if (group == null) return [];

        var children = new List<GroupMemberNode>(group.MemberDns.Length);
        foreach (var memberDn in group.MemberDns)
        {
            var memberGroup = Groups.FirstOrDefault(item => string.Equals(item.Dn, memberDn, StringComparison.OrdinalIgnoreCase));
            if (memberGroup != null)
            {
                children.Add(new GroupMemberNode
                {
                    Name = memberGroup.Name,
                    Dn = memberGroup.Dn,
                    IsGroup = true,
                    Depth = currentDepth + 1,
                    CycleReference = ancestorDns.Contains(memberGroup.Dn),
                    DepthLimitReached = !ancestorDns.Contains(memberGroup.Dn) && currentDepth + 1 >= maxDepth
                });
                continue;
            }

            var user = Users.FirstOrDefault(item => string.Equals(item.Dn, memberDn, StringComparison.OrdinalIgnoreCase));
            children.Add(new GroupMemberNode
            {
                Name = user?.Name ?? NameFromDn(memberDn),
                Dn = memberDn,
                IsGroup = false,
                Depth = currentDepth + 1
            });
        }

        return children;
    }

    private static ADGroupsSummary CreateAdGroupsSummary()
    {
        var items = Groups.Select(ToAdGroupJson).ToList();
        var membership = IndirectMembershipCalculator.Compute(items, item => ReadString(item, "distinguishedName"), ReadStrings);
        return new ADGroupsSummary
        {
            TotalCount = items.Count,
            Items = items,
            DirectByDn = membership.DirectByDn,
            IndirectByDn = membership.IndirectByDn,
            DirectCountByDn = membership.DirectByDn.ToDictionary(pair => pair.Key, pair => pair.Value.Count, StringComparer.OrdinalIgnoreCase),
            IndirectCountByDn = membership.IndirectByDn.ToDictionary(pair => pair.Key, pair => pair.Value.Count, StringComparer.OrdinalIgnoreCase)
        };
    }

    private static ADGroupDetailSummary ToGroupDetails(ADGroupsSummary allGroups, IEnumerable<GroupRecord> groups)
    {
        var items = groups.Select(group => new ADGroupDetailInfo
        {
            Name = group.Name,
            Dn = group.Dn,
            DirectMembers = allGroups.DirectCountByDn.TryGetValue(group.Dn, out var direct) ? direct : 0,
            IndirectMembers = allGroups.IndirectCountByDn.TryGetValue(group.Dn, out var indirect) ? indirect : 0
        }).ToList();
        return new ADGroupDetailSummary { TotalCount = items.Count, Items = items };
    }

    private static ADUserAccountDetailSummary ToUserDetails(IEnumerable<ADUserAccountDetailInfo> users)
    {
        var items = users.ToList();
        return new ADUserAccountDetailSummary { TotalCount = items.Count, Items = items };
    }

    private static GovernanceKpiSummary ToGovernanceDetails(IEnumerable<UserRecord> users)
    {
        var items = users.Select(user => new GovernanceKpiInfo
        {
            Name = user.Name,
            Domain = Domain,
            Dn = user.Dn,
            Guid = user.ObjectGuid
        }).ToList();
        return new GovernanceKpiSummary { TotalCount = items.Count, Items = items };
    }

    private static GovernanceKpiSummary ToGovernanceDetails(IEnumerable<GroupRecord> groups)
    {
        var items = groups.Select(group => new GovernanceKpiInfo
        {
            Name = group.Name,
            Domain = Domain,
            Dn = group.Dn,
            Guid = group.ObjectGuid
        }).ToList();
        return new GovernanceKpiSummary { TotalCount = items.Count, Items = items };
    }

    private static EntraTotalsSummary CreateEntraSummary()
    {
        var items = new List<EntraObjectInfo>();
        var ownerOneDn = "CN=Jordan Owner (TEMP),OU=Users,DC=demo,DC=local";
        var ownerTwoDn = "CN=Casey Owner (TEMP),OU=Users,DC=demo,DC=local";
        var regularUserDn = "CN=Alex Cloud (TEMP),OU=Users,DC=demo,DC=local";
        var guestUserDn = "CN=Taylor Guest (TEMP),OU=Users,DC=demo,DC=local";

        items.Add(CreateEntraUser(EntraObjectType.User, "Alex Cloud (TEMP)", regularUserDn, "alex.cloud@demo.onmicrosoft.com", true, ""));
        items.Add(CreateEntraUser(EntraObjectType.User, "Jordan Owner (TEMP)", ownerOneDn, "jordan.owner@demo.onmicrosoft.com", true, ""));
        items.Add(CreateEntraUser(EntraObjectType.User, "Casey Owner (TEMP)", ownerTwoDn, "casey.owner@demo.onmicrosoft.com", true, ""));
        items.Add(CreateEntraUser(EntraObjectType.GuestUser, "Taylor Guest (TEMP)", guestUserDn, "taylor_example.com#EXT#@demo.onmicrosoft.com", true, ""));
        items.Add(CreateEntraGroup(EntraObjectType.Microsoft365Group, "Product Team (TEMP)", "CN=Product Team (TEMP),OU=Groups,DC=demo,DC=local", [regularUserDn, guestUserDn], [ownerOneDn, ownerTwoDn], "Public"));
        items.Add(CreateEntraGroup(EntraObjectType.SecurityGroup, "Cloud Operators (TEMP)", "CN=Cloud Operators (TEMP),OU=Groups,DC=demo,DC=local", [regularUserDn], [ownerOneDn]));
        items.Add(CreateEntraGroup(EntraObjectType.DistributionGroup, "Unowned Announcements (TEMP)", "CN=Unowned Announcements (TEMP),OU=Groups,DC=demo,DC=local", [], []));
        items.Add(CreateEntraGroup(EntraObjectType.DynamicDistributionGroup, "Dynamic Staff (TEMP)", "CN=Dynamic Staff (TEMP),OU=Groups,DC=demo,DC=local", [regularUserDn], [ownerTwoDn]));

        var groupCount = items.Count(item => IsEntraGroup(item.ObjectType));
        return new EntraTotalsSummary
        {
            Tenants = [EntraTenant],
            Items = items,
            TotalCount = items.Count,
            MembershipLoaded = true,
            MembershipLoadedCount = groupCount,
            ByObjectType = EntraObjectTypeInfo.All
                .Select(type => new EntraObjectTypeCount
                {
                    ObjectType = type,
                    TotalCount = items.Count(item => item.ObjectType == type)
                })
                .ToList()
        };
    }

    private static EntraObjectInfo CreateEntraUser(EntraObjectType type, string name, string dn, string upn, bool enabled, string manager)
    {
        var raw = JsonSerializer.SerializeToElement(new Dictionary<string, object?>
        {
            ["name"] = name,
            ["distinguishedName"] = dn,
            ["edsaAzureUserPrincipalName"] = upn,
            ["edsaAzureUserAccountEnabled"] = enabled ? "TRUE" : "FALSE",
            ["manager"] = manager,
            ["edsaDomainNetbiosName"] = Domain,
            ["description"] = Label
        });
        return new EntraObjectInfo { Name = name, Dn = dn, Tenant = EntraTenant, ObjectType = type, Raw = raw };
    }

    private static EntraObjectInfo CreateEntraGroup(EntraObjectType type, string name, string dn, string[] members, string[] owners, string visibility = "Private")
    {
        var attributes = new Dictionary<string, object?>
        {
            ["name"] = name,
            ["distinguishedName"] = dn,
            ["visibility"] = visibility,
            ["edsvaOnPremisesSyncEnabled"] = "FALSE",
            ["description"] = Label
        };
        // Active Roles omits empty multi-valued attributes; an empty array would read as "[]".
        if (members.Length > 0) attributes["member"] = members;
        if (owners.Length > 0) attributes["edsaAzureGroupManagedBy"] = owners;
        var raw = JsonSerializer.SerializeToElement(attributes);
        return new EntraObjectInfo { Name = name, Dn = dn, Tenant = EntraTenant, ObjectType = type, Raw = raw };
    }

    private static JsonElement ToAdUserJson(UserRecord user)
    {
        var memberOf = Groups.Where(group => group.MemberDns.Contains(user.Dn, StringComparer.OrdinalIgnoreCase)).Select(group => group.Dn).ToArray();
        return JsonSerializer.SerializeToElement(new Dictionary<string, object?>
        {
            ["name"] = user.Name,
            ["samAccountName"] = user.SamAccountName,
            ["distinguishedName"] = user.Dn,
            ["objectGuid"] = user.ObjectGuid,
            ["objectClass"] = new[] { "top", "person", "organizationalPerson", "user" },
            ["edsaDomainNetbiosName"] = Domain,
            ["userAccountControl"] = user.Enabled ? "512" : "514",
            ["manager"] = user.ManagerDn ?? "",
            ["mail"] = user.Email,
            ["description"] = Label,
            ["memberOf"] = memberOf
        });
    }

    private static JsonElement ToAdGroupJson(GroupRecord group) => JsonSerializer.SerializeToElement(new Dictionary<string, object?>
    {
        ["name"] = group.Name,
        ["distinguishedName"] = group.Dn,
        ["objectGuid"] = group.ObjectGuid,
        ["objectClass"] = new[] { "top", "group" },
        ["edsaDomainNetbiosName"] = Domain,
        ["groupType"] = group.GroupType,
        ["edsaIsDynamicGroup"] = "FALSE",
        ["edsvaGFIsGroupFamily"] = "FALSE",
        ["member"] = group.MemberDns,
        ["managedBy"] = group.OwnerDn ?? "",
        ["edsvaSecondaryOwners"] = group.SecondaryOwnerDns,
        ["mail"] = group.Mail ?? "",
        ["description"] = Label
    });

    private static string ReadString(JsonElement item, string attribute) =>
        item.ValueKind == JsonValueKind.Object
        && item.TryGetProperty(attribute, out var value)
        ? value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : value.ToString()
        : "";

    private static List<string> ReadStrings(JsonElement item, string attribute)
    {
        if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty(attribute, out var value)) return [];
        if (value.ValueKind == JsonValueKind.Array)
            return value.EnumerateArray().Select(element => element.ValueKind == JsonValueKind.String ? element.GetString() ?? "" : element.ToString()).Where(text => text.Length > 0).ToList();
        var single = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
        return string.IsNullOrWhiteSpace(single) ? [] : [single];
    }

    private static bool IsSecurityGroup(GroupRecord group) => (group.GroupType & unchecked((int)0x80000000)) != 0;
    private static bool IsEntraGroup(EntraObjectType type) => type is EntraObjectType.DistributionGroup or EntraObjectType.DynamicDistributionGroup or EntraObjectType.Microsoft365Group or EntraObjectType.SecurityGroup;
    private static string NameFromDn(string dn)
    {
        var firstPart = dn.Split(',')[0];
        return firstPart.StartsWith("CN=", StringComparison.OrdinalIgnoreCase) ? firstPart[3..] : dn;
    }
}